ALTER TABLE "Document"
  ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english',
        coalesce(title, '') || ' ' || coalesce("extractedText", '')
      )
    ) STORED;

CREATE INDEX document_search_vector_idx ON "Document" USING GIN(search_vector);
