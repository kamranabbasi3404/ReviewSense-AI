import io
import csv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database.database import get_db
from models.db_models import Project, Review, User
from routers.auth import get_current_user
from services.groq_service import generate_insights

# Optional reportlab import, handles fallback if not installed yet
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])

@router.get("/{id}/csv")
def export_csv(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    reviews = db.query(Review).filter(Review.project_id == id).all()

    def generate():
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Review text", "Prediction", "Confidence"])
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        for review in reviews:
            writer.writerow([review.review_text, review.prediction, f"{review.confidence:.2f}%"])
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    filename = f"reviewsense_project_{project.id}_export.csv"
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return StreamingResponse(generate(), media_type="text/csv", headers=headers)

@router.get("/{id}/pdf")
def export_pdf(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if not REPORTLAB_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PDF generation engine is not installed on the server. Please run pip install reportlab."
        )

    # Fetch stats
    total_count = db.query(Review).filter(Review.project_id == id).count()
    positive_count = db.query(Review).filter(Review.project_id == id, Review.prediction == "Positive").count()
    negative_count = db.query(Review).filter(Review.project_id == id, Review.prediction == "Negative").count()
    
    # Fetch sample reviews for insight (limit to 15 positive, 15 negative)
    sample_pos = db.query(Review.review_text).filter(Review.project_id == id, Review.prediction == "Positive").limit(15).all()
    sample_neg = db.query(Review.review_text).filter(Review.project_id == id, Review.prediction == "Negative").limit(15).all()

    sample_pos_list = [r[0] for r in sample_pos]
    sample_neg_list = [r[0] for r in sample_neg]

    # Generate insights for the PDF
    insights = generate_insights(
        project_name=project.project_name,
        total_count=total_count,
        positive_count=positive_count,
        negative_count=negative_count,
        sample_positive=sample_pos_list,
        sample_negative=sample_neg_list
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=54, leftMargin=54, topMargin=54, bottomMargin=54)
    story = []

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0F172A'), # slate-900
        spaceAfter=15
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B'), # slate-500
        spaceAfter=30
    )
    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=15,
        spaceAfter=10
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=8
    )

    # Document Header
    story.append(Paragraph("ReviewSense AI Report", title_style))
    story.append(Paragraph(f"Project Name: {project.project_name} | Generated on: {project.upload_date.strftime('%Y-%m-%d %H:%M')}", subtitle_style))
    story.append(Spacer(1, 10))

    # Stats Table
    pos_pct = (positive_count / (total_count or 1)) * 100
    neg_pct = (negative_count / (total_count or 1)) * 100
    
    data = [
        [Paragraph("<b>Metric</b>", body_style), Paragraph("<b>Count</b>", body_style), Paragraph("<b>Percentage</b>", body_style)],
        [Paragraph("Total Reviews", body_style), str(total_count), "100.0%"],
        [Paragraph("Positive Reviews", body_style), str(positive_count), f"{pos_pct:.1f}%"],
        [Paragraph("Negative Reviews", body_style), str(negative_count), f"{neg_pct:.1f}%"],
    ]
    t = Table(data, colWidths=[200, 100, 100])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
    ]))
    story.append(t)
    story.append(Spacer(1, 20))

    # AI Summary
    story.append(Paragraph("AI Sentiment Summary", h2_style))
    story.append(Paragraph(insights.get("summary", "No summary available."), body_style))
    story.append(Spacer(1, 15))

    # Top Complaints
    story.append(Paragraph("Top Customer Complaints", h2_style))
    for complaint in insights.get("top_complaints", []):
        story.append(Paragraph(f"• {complaint}", body_style))
    if not insights.get("top_complaints"):
        story.append(Paragraph("No complaints detected.", body_style))
    story.append(Spacer(1, 15))

    # Appreciated Features
    story.append(Paragraph("Key Appreciated Features", h2_style))
    for feature in insights.get("appreciated_features", []):
        story.append(Paragraph(f"• {feature}", body_style))
    if not insights.get("appreciated_features"):
        story.append(Paragraph("No specific features detected.", body_style))
    story.append(Spacer(1, 15))

    # Recommendations
    story.append(Paragraph("Actionable Business Recommendations", h2_style))
    for rec in insights.get("recommendations", []):
        story.append(Paragraph(f"• {rec}", body_style))
    if not insights.get("recommendations"):
        story.append(Paragraph("No recommendations available.", body_style))

    # Build PDF
    doc.build(story)
    buffer.seek(0)

    filename = f"reviewsense_{project.project_name.lower().replace(' ', '_')}_report.pdf"
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return StreamingResponse(buffer, media_type="application/pdf", headers=headers)
