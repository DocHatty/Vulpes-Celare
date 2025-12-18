# MTSamples Clinical Transcription Corpus

**Source:** [Kaggle - Medical Transcriptions](https://www.kaggle.com/tboyle10/medicaltranscriptions)  
**License:** CC0 (Public Domain)

## Setup

Place `mtsamples.csv` in this directory:
```
tests/master-suite/corpora/mtsamples/mtsamples.csv
```

## Dataset Info

- **~5,000 clinical documents** across 40+ medical specialties
- **17 MB** CSV file
- Fields: description, medical_specialty, sample_name, transcription, keywords

## Usage

The `mtsamples-loader.js` will automatically find this file. No configuration needed.

```javascript
const { loadMTSamples } = require('../corpus/mtsamples-loader');
const docs = loadMTSamples();  // Loads from this folder automatically
```

## Purpose

Used for PHI injection validation testing per the Composite Validation Schema methodology:
- Inject synthetic PHI into real clinical text
- Track ground truth for precision/recall measurement
- Test across specialty-diverse documents
