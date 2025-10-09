#!/usr/bin/env python3
"""Test rapide pour vérifier que l'API fonctionne"""

import requests
import json

BASE_URL = "https://builder.synoptia.fr"
AUTH = ("admin", "Pepette1710*")

print("🧪 Test rapide de l'API...")

# Test simple
response = requests.post(
    f"{BASE_URL}/api/generate",
    auth=AUTH,
    json={
        "message": "Crée un workflow qui envoie un email tous les lundis matin",
        "autoExecute": False
    },
    timeout=30
)

print(f"\n📡 Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    print(f"✅ Success: {data.get('success')}")
    print(f"📊 Workflow généré: {data.get('workflow') is not None}")
    print(f"🔢 Nodes: {len(data.get('workflow', {}).get('nodes', []))}")
    print(f"⭐ Score: {data.get('validation', {}).get('score', 0)}/100")
    print(f"🎯 Grade: {data.get('validation', {}).get('grade', 'N/A')}")
    print(f"\n✨ L'API fonctionne correctement!")
else:
    print(f"❌ Erreur: {response.text}")
