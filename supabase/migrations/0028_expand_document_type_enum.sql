-- Add document type values that the UI already supports but were missing from the enum.
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'nric_front';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'nric_back';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'work_permit_front';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'work_permit_back';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'wsq_certification';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'medical_report';
