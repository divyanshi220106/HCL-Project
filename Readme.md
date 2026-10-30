# TalentLens: AI-Based Resume Screening and Candidate Shortlisting System

Reads a job description and a set of resumes, extracts skills, experience and education,
measures text relevance with TF-IDF and cosine similarity, and ranks and shortlists the candidates.

## Project structure

    index.html                  web application (open it in any browser)
    css/style.css               styling, light and dark theme, animations
    js/engine.js                screening engine (extraction, TF-IDF, scoring)
    js/app.js                   user interface logic
    js/data.js                  sample job description and resumes
    python/screening_engine.py  the same engine in Python (command line)
    tests/                      automated tests (Python and JavaScript)
    data/                       sample job description and resumes

## How to run

    Web app:        open index.html in a browser
    Python engine:  python python/screening_engine.py
    Tests:          python tests/test_screening.py
                    node tests/test_engine.js

## Scoring

    Final score = 100 x (w1*Skills + w2*Relevance + w3*Experience + w4*Education) / (w1+w2+w3+w4)

Default weights are 50, 25, 15 and 10. Candidates at or above the cutoff (default 60) are shortlisted.
