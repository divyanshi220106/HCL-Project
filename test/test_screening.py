"""Tests for the screening engine. Run: python tests/test_screening.py  (or: pytest tests)"""
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "python"))
from screening_engine import (cosine_similarities, education_level, extract_skills,  # noqa: E402
                              extract_years, load_resumes, screen)

DATA = os.path.join(ROOT, "data")
JOB = open(os.path.join(DATA, "sample_job_description.txt"), encoding="utf-8").read()
RESUMES = load_resumes(os.path.join(DATA, "sample_resumes.txt"))


def test_java_is_not_javascript():
    assert extract_skills("Expert in JavaScript") == ["javascript"]
    assert "java" in extract_skills("Backend developer in Java and SQL")


def test_special_character_skill():
    assert "c++" in extract_skills("Five years of C++ development")


def test_years_uses_largest_value():
    assert extract_years("5 years of experience") == 5
    assert extract_years("3+ yrs in sales") == 3
    assert extract_years("2 years at A and 6 years at B") == 6
    assert extract_years("fresh graduate") == 0


def test_education_levels():
    assert education_level("PhD in physics") == 3
    assert education_level("M.Tech in CSE") == 2
    assert education_level("B.Tech in IT") == 1
    assert education_level("It would be nice to be part of the team") == 0


def test_identical_text_has_highest_similarity():
    a = "python machine learning engineer"
    same, other = cosine_similarities(a, [a, "cooking and gardening tips"])
    assert same > 0.99 and other < 0.2


def test_sample_ranking_and_scores():
    result = screen(JOB, RESUMES)
    assert [(r["name"], r["score"]) for r in result] == [
        ("Neha Singh", 84), ("Aarav Sharma", 82), ("Priya Verma", 70),
        ("Karan Mehta", 37), ("Rohan Gupta", 34)]


def test_status_labels_follow_cutoff():
    status = {r["name"]: r["status"] for r in screen(JOB, RESUMES, cutoff=60)}
    assert status["Neha Singh"] == status["Priya Verma"] == "Shortlisted"
    assert status["Karan Mehta"] == status["Rohan Gupta"] == "Not selected"
    assert {r["name"]: r["status"] for r in screen(JOB, RESUMES, cutoff=80)}["Priya Verma"] == "Under review"


def test_weights_change_scores_and_need_not_sum_to_100():
    only_exp = {"skills": 0, "relevance": 0, "experience": 100, "education": 0}
    scores = {r["name"]: r["score"] for r in screen(JOB, RESUMES, weights=only_exp)}
    assert scores["Priya Verma"] == 67 and scores["Rohan Gupta"] == 100
    double = {k: v * 2 for k, v in {"skills": 50, "relevance": 25, "experience": 15, "education": 10}.items()}
    assert [r["score"] for r in screen(JOB, RESUMES, weights=double)] == [84, 82, 70, 37, 34]


def test_job_without_known_skills_does_not_crash():
    result = screen("We need a friendly person.", RESUMES)
    assert len(result) == 5 and all(0 <= r["score"] <= 100 for r in result)


if __name__ == "__main__":
    tests = [f for name, f in dict(globals()).items() if name.startswith("test_")]
    for t in tests:
        t()
        print("PASS", t.__name__)
    print(f"{len(tests)} of {len(tests)} tests passed")
