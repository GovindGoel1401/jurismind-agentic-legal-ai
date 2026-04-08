## Legal Corpus Ingestion

Current storage split:

- Judgment / similar-case PDFs -> Chroma Cloud when configured, otherwise Qdrant
- Rules / law PDFs -> Qdrant
- User case description + uploaded document/evidence summaries -> FAISS / faiss-node

Embedding split:

- Text-heavy judgments and rules -> Vertex AI text embeddings
- User evidence / uploaded case material -> Vertex AI multimodal-capable embedding path

Current legal corpus files:

- Judgments to similar-case vector store:
  - `dbsimilarcasecontract.pdf`
  - `indianconscontract.pdf`
- Rules / laws to Qdrant:
  - `2023111188.pdf`
  - `2022080877.pdf`
  - `2022080820.pdf`
  - `negotiable_instruments_act,_1881.pdf`

Important note:

The current user-input flow only includes case description plus uploaded document metadata and evidence summaries. That means FAISS indexing currently stores:

- user case description
- detected document summaries
- evidence inventory summaries

If later you add actual uploaded file text extraction or OCR, the same FAISS indexing path can store full document text chunks too.

Run ingestion:

`npm run ingest:legal-corpus`

Dry run only:

`node scripts/indexLegalCorpus.js --dry-run`
