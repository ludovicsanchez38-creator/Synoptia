#!/usr/bin/env python3
"""
Script de benchmark pour Synoptia Workflow Builder
Tests automatisés avec métriques et rapport markdown
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, List
import statistics

# Configuration
BASE_URL = "https://builder.synoptia.fr"
AUTH = ("admin", "Pepette1710*")

# 10 prompts de test variés
TEST_PROMPTS = [
    {
        "id": 1,
        "category": "Email",
        "prompt": "Crée un workflow qui envoie un email tous les lundis matin à 9h"
    },
    {
        "id": 2,
        "category": "RSS & Automation",
        "prompt": "Automatise la veille : récupère un flux RSS, résume avec IA et envoie vers Notion"
    },
    {
        "id": 3,
        "category": "Scraping",
        "prompt": "Scrape ce site web et stocke les données dans Google Sheets"
    },
    {
        "id": 4,
        "category": "Chatbot",
        "prompt": "Chatbot support client avec base de connaissances"
    },
    {
        "id": 5,
        "category": "Backup",
        "prompt": "Backup automatique MongoDB vers S3 tous les jours"
    },
    {
        "id": 6,
        "category": "Notification",
        "prompt": "Notification Slack quand nouvel email important arrive dans Gmail"
    },
    {
        "id": 7,
        "category": "AI Image",
        "prompt": "Génère des images avec DALL-E et stocke sur Google Drive"
    },
    {
        "id": 8,
        "category": "ETL",
        "prompt": "Pipeline ETL : récupère données API, transforme avec IA, stocke dans PostgreSQL"
    },
    {
        "id": 9,
        "category": "Sentiment Analysis",
        "prompt": "Analyse le sentiment des commentaires réseaux sociaux et alerte si négatif"
    },
    {
        "id": 10,
        "category": "Onboarding",
        "prompt": "Workflow d'onboarding client automatique avec emails et création de comptes"
    }
]

class WorkflowTester:
    def __init__(self):
        self.results = []
        self.start_time = None
        self.end_time = None

    def test_workflow_generation(self, prompt_data: Dict) -> Dict:
        """Teste la génération d'un workflow"""
        print(f"\n🔄 Test #{prompt_data['id']}: {prompt_data['category']}")
        print(f"   Prompt: {prompt_data['prompt']}")

        start = time.time()

        try:
            response = requests.post(
                f"{BASE_URL}/api/generate",
                auth=AUTH,
                json={
                    "message": prompt_data["prompt"],
                    "autoExecute": False
                },
                timeout=60
            )

            duration = time.time() - start

            if response.status_code == 200:
                data = response.json()

                result = {
                    "id": prompt_data["id"],
                    "category": prompt_data["category"],
                    "prompt": prompt_data["prompt"],
                    "success": data.get("success", False),
                    "workflow_generated": data.get("workflow") is not None,
                    "json_valid": self._validate_json(data.get("workflow")),
                    "duration": duration,
                    "node_count": len(data.get("workflow", {}).get("nodes", [])) if data.get("workflow") else 0,
                    "validation": data.get("validation", {}),
                    "score": data.get("validation", {}).get("score", 0),
                    "grade": data.get("validation", {}).get("grade", "F"),
                    "errors": data.get("validation", {}).get("errors", []),
                    "warnings": data.get("validation", {}).get("warnings", [])
                }

                print(f"   ✅ Généré en {duration:.2f}s - Score: {result['score']}/100 ({result['grade']})")
                return result

            else:
                print(f"   ❌ Erreur HTTP {response.status_code}")
                return {
                    "id": prompt_data["id"],
                    "category": prompt_data["category"],
                    "prompt": prompt_data["prompt"],
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                    "duration": duration
                }

        except Exception as e:
            duration = time.time() - start
            print(f"   ❌ Exception: {str(e)}")
            return {
                "id": prompt_data["id"],
                "category": prompt_data["category"],
                "prompt": prompt_data["prompt"],
                "success": False,
                "error": str(e),
                "duration": duration
            }

    def _validate_json(self, workflow: Dict) -> bool:
        """Valide que le workflow est un JSON valide avec structure n8n"""
        if not workflow:
            return False

        required_fields = ["nodes", "connections"]
        return all(field in workflow for field in required_fields)

    def run_all_tests(self):
        """Exécute tous les tests"""
        print("=" * 60)
        print("🧪 SYNOPTIA WORKFLOW BUILDER - BENCHMARK")
        print("=" * 60)

        self.start_time = datetime.now()

        for prompt_data in TEST_PROMPTS:
            result = self.test_workflow_generation(prompt_data)
            self.results.append(result)
            time.sleep(1)  # Pause entre les tests

        self.end_time = datetime.now()

    def calculate_metrics(self) -> Dict:
        """Calcule les métriques globales"""
        successful = [r for r in self.results if r.get("success")]
        workflows_generated = [r for r in self.results if r.get("workflow_generated")]
        valid_json = [r for r in self.results if r.get("json_valid")]

        durations = [r["duration"] for r in self.results if "duration" in r]
        scores = [r["score"] for r in self.results if "score" in r and r["score"] > 0]

        grade_distribution = {}
        for r in self.results:
            grade = r.get("grade", "F")
            grade_distribution[grade] = grade_distribution.get(grade, 0) + 1

        return {
            "total_tests": len(TEST_PROMPTS),
            "successful": len(successful),
            "success_rate": (len(successful) / len(TEST_PROMPTS)) * 100,
            "workflows_generated": len(workflows_generated),
            "valid_json": len(valid_json),
            "avg_duration": statistics.mean(durations) if durations else 0,
            "min_duration": min(durations) if durations else 0,
            "max_duration": max(durations) if durations else 0,
            "avg_score": statistics.mean(scores) if scores else 0,
            "min_score": min(scores) if scores else 0,
            "max_score": max(scores) if scores else 0,
            "grade_distribution": grade_distribution,
            "total_duration": (self.end_time - self.start_time).total_seconds()
        }

    def generate_report(self):
        """Génère un rapport markdown"""
        metrics = self.calculate_metrics()

        report = f"""# 📊 WORKFLOW BUILDER - RAPPORT DE TESTS

**Date:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**Durée totale:** {metrics['total_duration']:.2f}s

---

## 📈 MÉTRIQUES GLOBALES

| Métrique | Valeur | Attendu | Status |
|----------|--------|---------|--------|
| **Tests exécutés** | {metrics['total_tests']}/10 | 10/10 | {'✅' if metrics['total_tests'] == 10 else '❌'} |
| **Taux de succès** | {metrics['success_rate']:.1f}% | >80% | {'✅' if metrics['success_rate'] >= 80 else '⚠️' if metrics['success_rate'] >= 60 else '❌'} |
| **Workflows générés** | {metrics['workflows_generated']}/{metrics['total_tests']} | {metrics['total_tests']}/{metrics['total_tests']} | {'✅' if metrics['workflows_generated'] == metrics['total_tests'] else '❌'} |
| **JSON valides** | {metrics['valid_json']}/{metrics['total_tests']} | {metrics['total_tests']}/{metrics['total_tests']} | {'✅' if metrics['valid_json'] == metrics['total_tests'] else '❌'} |
| **Temps moyen** | {metrics['avg_duration']:.2f}s | <10s | {'✅' if metrics['avg_duration'] < 10 else '⚠️'} |
| **Score moyen** | {metrics['avg_score']:.1f}/100 | >85/100 | {'✅' if metrics['avg_score'] >= 85 else '⚠️' if metrics['avg_score'] >= 70 else '❌'} |

---

## 🎯 DISTRIBUTION DES GRADES

| Grade | Nombre | Pourcentage |
|-------|--------|-------------|
"""

        for grade in ['A+', 'A', 'B', 'C', 'D', 'F']:
            count = metrics['grade_distribution'].get(grade, 0)
            percentage = (count / metrics['total_tests']) * 100
            report += f"| **{grade}** | {count} | {percentage:.1f}% |\n"

        report += f"""
---

## 📋 RÉSULTATS DÉTAILLÉS

| # | Catégorie | Score | Grade | Durée | Status |
|---|-----------|-------|-------|-------|--------|
"""

        for r in self.results:
            status = "✅" if r.get("success") else "❌"
            score = r.get("score", 0)
            grade = r.get("grade", "F")
            duration = r.get("duration", 0)

            report += f"| {r['id']} | {r['category']} | {score}/100 | {grade} | {duration:.2f}s | {status} |\n"

        report += f"""
---

## 🔍 ANALYSE PAR PROMPT

"""

        for r in self.results:
            report += f"""
### Test #{r['id']}: {r['category']}

**Prompt:** `{r['prompt']}`

**Résultat:**
- Status: {'✅ Success' if r.get('success') else '❌ Failed'}
- Score: {r.get('score', 0)}/100
- Grade: {r.get('grade', 'N/A')}
- Durée: {r.get('duration', 0):.2f}s
- Nodes: {r.get('node_count', 0)}
"""

            if r.get('errors'):
                report += f"- ❌ Erreurs: {len(r['errors'])}\n"
                for err in r['errors'][:3]:  # Max 3 erreurs
                    report += f"  - {err}\n"

            if r.get('warnings'):
                report += f"- ⚠️ Warnings: {len(r['warnings'])}\n"

        report += f"""
---

## 💡 RECOMMANDATIONS

"""

        if metrics['success_rate'] >= 80:
            report += "✅ **Excellent!** Le système fonctionne très bien.\n"
        elif metrics['success_rate'] >= 60:
            report += "⚠️ **Bon mais peut mieux faire.** Quelques améliorations nécessaires.\n"
        else:
            report += "❌ **À améliorer.** Le système nécessite des corrections importantes.\n"

        if metrics['avg_score'] < 85:
            report += f"\n⚠️ Score moyen ({metrics['avg_score']:.1f}) inférieur à l'objectif (85). Vérifier la qualité des workflows générés.\n"

        if metrics['avg_duration'] > 10:
            report += f"\n⚠️ Temps moyen ({metrics['avg_duration']:.2f}s) supérieur à l'objectif (10s). Optimiser les performances.\n"

        report += f"""
---

## 📊 COMPARAISON AVEC OBJECTIFS

| Objectif | Valeur actuelle | Cible | Atteint? |
|----------|-----------------|-------|----------|
| Taux de succès | {metrics['success_rate']:.1f}% | 80% | {'✅' if metrics['success_rate'] >= 80 else '❌'} |
| Score moyen | {metrics['avg_score']:.1f}/100 | 85/100 | {'✅' if metrics['avg_score'] >= 85 else '❌'} |
| Temps moyen | {metrics['avg_duration']:.2f}s | <10s | {'✅' if metrics['avg_duration'] < 10 else '❌'} |
| Grades A+/A | {metrics['grade_distribution'].get('A+', 0) + metrics['grade_distribution'].get('A', 0)} | >70% | {'✅' if (metrics['grade_distribution'].get('A+', 0) + metrics['grade_distribution'].get('A', 0)) / metrics['total_tests'] >= 0.7 else '❌'} |

---

**Rapport généré par test-benchmark.py**
"""

        return report

    def save_results(self):
        """Sauvegarde les résultats"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # JSON brut
        json_file = f"tests/benchmark_results_{timestamp}.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "metrics": self.calculate_metrics(),
                "results": self.results
            }, f, indent=2, ensure_ascii=False)

        print(f"\n💾 Résultats JSON: {json_file}")

        # Rapport markdown
        report = self.generate_report()
        md_file = f"tests/benchmark_report_{timestamp}.md"
        with open(md_file, 'w', encoding='utf-8') as f:
            f.write(report)

        print(f"📄 Rapport markdown: {md_file}")

        # Affiche aussi le rapport
        print("\n" + "=" * 60)
        print(report)

def main():
    """Point d'entrée"""
    tester = WorkflowTester()

    # Vérifie que le serveur est accessible
    try:
        response = requests.get(f"{BASE_URL}/health", auth=AUTH, timeout=5)
        if response.status_code != 200:
            print(f"❌ Serveur non accessible: {BASE_URL}")
            return
    except Exception as e:
        print(f"❌ Impossible de se connecter au serveur: {e}")
        return

    print(f"✅ Serveur accessible: {BASE_URL}\n")

    # Lance les tests
    tester.run_all_tests()

    # Sauvegarde et affiche les résultats
    tester.save_results()

    print("\n✨ Tests terminés!")

if __name__ == "__main__":
    main()
