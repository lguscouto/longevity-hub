"""
Router FastAPI para Avaliações Físicas e Fotografias Corporais.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, Response

from backend.app.config import DATA_DIR, get_db_path
from longevidade.assessments.service import PhysicalAssessmentService
from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db

router = APIRouter(prefix="/api/physical-assessments", tags=["Physical Assessments"])


def _service() -> PhysicalAssessmentService:
    db_path = get_db_path()
    repo = LongevityRepository(db_path)
    return PhysicalAssessmentService(repo, DATA_DIR)


@router.get("", response_model=List[Dict[str, Any]])
def list_physical_assessments(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
) -> List[Dict[str, Any]]:
    try:
        service = _service()
        assessments = service.list_assessments(
            limit=limit, offset=offset, start_date=start_date, end_date=end_date
        )
    except FileNotFoundError:
        return []
    # Adiciona content_url para cada foto
    for ass in assessments:
        for p in ass.get("photos", []):
            p["content_url"] = f"/api/physical-assessments/{ass['id']}/photos/{p['id']}/content"
    return assessments


@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def create_physical_assessment(payload: Dict[str, Any]) -> Dict[str, Any]:
    service = _service()
    try:
        assessment = service.create_assessment(payload)
        return assessment
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/compare", response_model=Dict[str, Any])
def compare_physical_assessments(
    previous_id: str = Query(..., description="ID da avaliação física anterior"),
    current_id: str = Query(..., description="ID da avaliação física atual"),
) -> Dict[str, Any]:
    service = _service()
    try:
        manifest = service.compare_assessments(previous_id, current_id)
        # Adiciona content_url nas fotos pareadas
        for match in manifest.get("matched_photos", []):
            if match.get("previous_photo"):
                p = match["previous_photo"]
                p["content_url"] = f"/api/physical-assessments/{previous_id}/photos/{p['id']}/content"
            if match.get("current_photo"):
                c = match["current_photo"]
                c["content_url"] = f"/api/physical-assessments/{current_id}/photos/{c['id']}/content"
        return manifest
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/{assessment_id}", response_model=Dict[str, Any])
def get_physical_assessment(assessment_id: str) -> Dict[str, Any]:
    service = _service()
    assessment = service.get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Avaliação física {assessment_id} não encontrada",
        )
    for p in assessment.get("photos", []):
        p["content_url"] = f"/api/physical-assessments/{assessment_id}/photos/{p['id']}/content"
    return assessment


@router.put("/{assessment_id}", response_model=Dict[str, Any])
@router.patch("/{assessment_id}", response_model=Dict[str, Any])
def update_physical_assessment(
    assessment_id: str, payload: Dict[str, Any]
) -> Dict[str, Any]:
    service = _service()
    try:
        updated = service.update_assessment(assessment_id, payload)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Avaliação física {assessment_id} não encontrada",
            )
        for p in updated.get("photos", []):
            p["content_url"] = f"/api/physical-assessments/{assessment_id}/photos/{p['id']}/content"
        return updated
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.delete("/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_physical_assessment(assessment_id: str) -> None:
    service = _service()
    deleted = service.delete_assessment(assessment_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Avaliação física {assessment_id} não encontrada",
        )


@router.post("/{assessment_id}/photos", response_model=List[Dict[str, Any]], status_code=status.HTTP_201_CREATED)
async def upload_assessment_photos(
    assessment_id: str,
    files: List[UploadFile] = File(...),
    angle: str = Form("other"),
    body_state: str = Form("unspecified"),
    description: Optional[str] = Form(None),
) -> List[Dict[str, Any]]:
    service = _service()
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Nenhum arquivo enviado"
        )

    saved_photos = []
    for index, upload in enumerate(files):
        try:
            content = await upload.read()
            photo = service.save_photo(
                assessment_id=assessment_id,
                file_bytes=content,
                original_filename=upload.filename or f"photo_{index}.jpg",
                angle=angle,
                body_state=body_state,
                description=description,
                display_order=index,
            )
            photo["content_url"] = f"/api/physical-assessments/{assessment_id}/photos/{photo['id']}/content"
            saved_photos.append(photo)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
            )
        except IOError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
            )

    return saved_photos


@router.get("/{assessment_id}/photos/download")
def download_assessment_photos(assessment_id: str) -> Response:
    service = _service()
    try:
        zip_buffer, filename = service.export_photos_zip(assessment_id)
        return Response(
            content=zip_buffer.getvalue(),
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/{assessment_id}/photos/{photo_id}/content")
def get_photo_content(assessment_id: str, photo_id: str) -> FileResponse:
    service = _service()
    try:
        file_path = service.get_photo_file_path(assessment_id, photo_id)
        photo = service.repo.get_physical_assessment_photo(photo_id)
        mime_type = photo.get("mime_type", "image/jpeg") if photo else "image/jpeg"
        return FileResponse(
            path=file_path,
            media_type=mime_type,
            filename=photo.get("stored_filename", file_path.name) if photo else file_path.name,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{assessment_id}/photos/{photo_id}", response_model=Dict[str, Any])
def update_photo_metadata(
    assessment_id: str, photo_id: str, payload: Dict[str, Any]
) -> Dict[str, Any]:
    service = _service()
    photo = service.repo.get_physical_assessment_photo(photo_id)
    if not photo or photo["assessment_id"] != assessment_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Foto não encontrada"
        )
    updated = service.update_photo(photo_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Foto não encontrada"
        )
    updated["content_url"] = f"/api/physical-assessments/{assessment_id}/photos/{photo_id}/content"
    return updated


@router.delete("/{assessment_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assessment_photo(assessment_id: str, photo_id: str) -> None:
    service = _service()
    deleted = service.delete_photo(assessment_id, photo_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Foto não encontrada"
        )
