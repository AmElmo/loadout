---
name: data-pipeline
description: Design and implement ETL data pipelines with validation and monitoring
metadata:
  role: data-engineering
  tags: [etl, data, pipeline]
---
# Data Pipeline Builder

Given a data source and target, design a complete ETL pipeline:

1. **Extract**: Define data source connectors and incremental extraction
2. **Transform**: Data cleaning, normalization, type casting, enrichment
3. **Load**: Batch or streaming load strategy with idempotency
4. **Validate**: Data quality checks — nulls, duplicates, schema drift
5. **Monitor**: Alerting on failures, row count anomalies, latency spikes

Use Python with `pandas` for batch, `Apache Beam` for streaming.
Always include retry logic and dead letter queues for failed records.
