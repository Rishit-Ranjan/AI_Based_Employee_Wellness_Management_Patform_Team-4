"""
AI Wellness Service - Provides intelligent wellness insights, chat, and predictions.
Uses a hybrid approach: rule-based reasoning + optional LLM integration.
"""

import os
import json
import random
import requests as http_requests
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, List, Any
from dotenv import load_dotenv
load_dotenv()


AI_POLICY_GUARDRAIL = """

IMPORTANT: Your role is strictly to be a wellness coach. If the user asks about topics outside of health, wellness, fitness, nutrition, or their data on this platform (e.g., politics, general knowledge, personal opinions), you must politely decline. State that your purpose is to assist with their wellness and gently redirect them back to a relevant topic.
"""


class AIWellnessService:
    """AI-powered wellness assistant service."""

    def __init__(self, db=None, risk_model=None, recommendation_engine=None):
        self.db = db
        self.risk_model = risk_model
        self.recommendation_engine = recommendation_engine
        
        self.recommendation_cache = {} # Cache for recommendations
        self.risk_prediction_cache = {} # Cache for risk predictions
        self.performance_analytics_cache = {} # Cache for performance analytics
        # Wellness tips database (rule-based fallback)
        self._init_wellness_knowledge_base()
    
    def _init_wellness_knowledge_base(self):
        """Initialize structured wellness knowledge."""
        
        # Wellness tips by category
        self.wellness_tips = {
            'sleep': [
                "Try the 10-3-2-1 method: 10 hours before bed - no caffeine, 3 hours - no food, 2 hours - no work, 1 hour - no screens.",
                "Keep your bedroom temperature between 65-68°F (18-20°C) for optimal sleep quality.",
                "Consistent sleep schedule - even on weekends - improves sleep quality by up to 50%.",
                "Magnesium glycinate before bed can help with deep sleep and muscle relaxation.",
                "Avoid blue light 90 minutes before sleep - it suppresses melatonin production by 50%.",
            ],
            'stress': [
                "Practice the 4-7-8 breathing technique: Inhale 4s, Hold 7s, Exhale 8s. Do 4 cycles.",
                "The 5-4-3-2-1 grounding technique: Name 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste.",
                "Progressive Muscle Relaxation (PMR): Tense each muscle group for 5s, then release.",
                "Journaling for 5 minutes about what's worrying you can reduce anxiety by 30%.",
                "Take a 'worry break': Set a timer for 15 minutes to stress, then move on.",
            ],
            'exercise': [
                "Even 15 minutes of brisk walking after meals can improve insulin sensitivity by 20%.",
                "Micro-workouts (5-10 min) throughout the day are more sustainable than one long session.",
                "Include strength training 2x/week - it boosts metabolism for up to 48 hours after.",
                "Morning exercise can improve decision-making and focus for up to 10 hours.",
                "Stretching for 5 minutes every hour of desk work prevents postural issues.",
            ],
            'nutrition': [
                "Eat protein within 30 minutes of waking to stabilize blood sugar and reduce cravings.",
                "The 'plate method': Fill 50% with vegetables, 25% protein, 25% complex carbs.",
                "Drink water 30 minutes before meals - it naturally reduces calorie intake.",
                "Include fermented foods (yogurt, kimchi, kombucha) daily for gut health.",
                "Eating meals at consistent times helps regulate circadian rhythm and metabolism.",
            ],
            'mental_health': [
                "Practice gratitude: Write 3 things you're grateful for every morning.",
                "Social connection is the #1 predictor of longevity and mental wellbeing.",
                "Setting micro-boundaries (e.g., 'no email after 7 PM') prevents burnout.",
                "The 20-20-20 rule: Every 20 min, look at something 20 feet away for 20 seconds.",
                "Celebrate small wins - acknowledging progress releases dopamine and builds momentum.",
            ]
        }
        
        # Conversation patterns for rule-based responses
        self.intent_patterns = {
            'sleep': ['sleep', 'insomnia', 'tired', 'rest', 'nap', 'bed', 'awake', 'fatigue'],
            'stress': ['stress', 'anxiety', 'worry', 'overwhelm', 'panic', 'nervous', 'calm', 'relax'],
            'exercise': ['exercise', 'workout', 'fitness', 'gym', 'run', 'walk', 'yoga', 'stretch', 'active'],
            'nutrition': ['diet', 'food', 'eat', 'nutrition', 'meal', 'hungry', 'calorie', 'protein', 'healthy'],
            'mental_health': ['mood', 'sad', 'depressed', 'happy', 'emotion', 'mental', 'mind', 'focus', 'motivation'],
            'bp': ['blood pressure', 'bp', 'hypertension', 'heart', 'cardio'],
            'bmi': ['bmi', 'weight', 'obese', 'overweight', 'fat'],
            'routine': ['routine', 'schedule', 'plan', 'daily', 'habit'],
            'greeting': ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good evening'],
        }
    
    def _detect_intent(self, message: str) -> str:
        """Detect the primary intent of a user message."""
        message_lower = message.lower()
        
        scores = {}
        for intent, keywords in self.intent_patterns.items():
            score = sum(1 for kw in keywords if kw in message_lower)
            if score > 0:
                scores[intent] = score
        
        if not scores:
            return 'general'
        
        return max(scores, key=scores.get)
    
    def _get_context_from_db(self, employee_id: str) -> Dict[str, Any]:
        """Fetch user's health context from database."""
        if self.db is None:
            return {}
        
        context = {}
        
        try:
            # Get health records
            health = self.db['health_records'].find_one({'employeeId': employee_id})
            if health:
                context['health'] = {
                    'age': health.get('age'),
                    'bmi': health.get('bmi'),
                    'blood_pressure': health.get('bloodPressure'),
                    'stress_level': health.get('stressLevel'),
                    'sleep_hours': health.get('sleepHoursPerNight'),
                    'exercise_hours': health.get('exerciseHoursPerWeek'),
                    'glucose': health.get('glucoseLevel'),
                }
            
            # Get daily habits
            habits = self.db['daily_habits'].find_one({'employeeId': employee_id})
            if habits:
                context['habits'] = {
                    'water_cups': habits.get('waterCups', 0),
                    'steps': habits.get('stepsCount', 0),
                }
            
            # Get recent mental health logs
            mental_logs = list(self.db['mental_health_logs'].find(
                {'employeeId': employee_id}
            ).sort('date', -1).limit(7))
            if mental_logs:
                context['mood_trend'] = [log.get('mood') for log in mental_logs if log.get('mood')]
            
            # Get recent SOS alerts
            sos_count = self.db['sos_alerts'].count_documents({
                'employeeId': employee_id,
                'createdAt': {'$gte': (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()}
            })
            context['recent_sos'] = sos_count
            
        except Exception as e:
            print(f"Error fetching context: {e}")
        
        return context
    
    def _get_current_llm_config(self) -> Dict[str, Any]:
        """Fetch the current LLM configuration from system settings or environment variables.

        The app uses Ollama (local LLM). The model name is resolved with this
        precedence:
          - DB system settings (admin UI) ``aiModelName`` override
          - ``AI_MODEL_NAME`` environment variable
          - sensible default (``qwen3:1.7b``)
        """
        # Provider is now fixed to Ollama
        provider = 'ollama'

        # Generic AI_MODEL_NAME from environment
        env_ai_model_name = os.getenv('AI_MODEL_NAME')

        model_name_from_settings = None
        if self.db is not None:
            settings = self.db['system_settings'].find_one({'_id': 'system_config'}) # Assuming 'system_config' is the ID
            if settings:
                model_name_from_settings = settings.get('aiModelName')
        
        # Prioritize DB setting, then environment variable, then hardcoded default
        model_name = model_name_from_settings if model_name_from_settings is not None else env_ai_model_name
        if not model_name:
            model_name = 'qwen3:1.7b' # Ultimate fallback

        return {
            'provider': provider,
            'model_name': model_name,
        }

    def _generate_llm_response(self, message: str, context: str, employee_id: str, llm_config: Dict) -> Optional[tuple[str, str]]:
        """Try to get response from the Ollama LLM. Returns (response_text, model_name) or None.
        The provider is now fixed to Ollama."""

        # The llm_config contains the model name from user input or from _get_current_llm_config.
        # We prioritize the user's input if it exists.
        model_name_to_use = llm_config.get('model_name')
        
        # If the resolved model name is empty or looks like a Gemini model, fall back to a safe Ollama default.
        if not model_name_to_use or 'gemini' in str(model_name_to_use).lower():
            model_name_to_use = os.getenv('AI_MODEL_NAME', 'qwen3:1.7b') # Fallback to env var or hardcoded default

        try:
            prompt = f"""Context (Employee Health Data): {context}

User message: {message}

As an AI Wellness Assistant, provide a helpful, concise response (max 150 words) with practical wellness advice.

{AI_POLICY_GUARDRAIL}"""
            ollama_base_url = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
            response = http_requests.post(
                f"{ollama_base_url}/api/generate",
                json={
                    "model": model_name_to_use,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=25
            )
            if response.status_code == 200:
                return response.json().get('response', ''), model_name_to_use
            else:
                error_msg = f"Ollama API returned status {response.status_code}: {response.text}"
                print(f"Ollama API error: {error_msg}")
                return f"Ollama model failed to respond. Please ensure the Ollama server is running and the '{model_name_to_use}' model is downloaded.", "Ollama Error"
            
        except http_requests.exceptions.ConnectionError as e:
            error_msg = f"Could not connect to Ollama server at {ollama_base_url}. Is Ollama running and '{model_name_to_use}' downloaded?"
            print(f"Ollama API error: {error_msg} - {e}")
            return f"Ollama model failed: {error_msg}", "Ollama Error"
        
        except http_requests.exceptions.Timeout as e:
            error_msg = f"Ollama API request timed out after 30 seconds."
            print(f"Ollama API error: {error_msg}")
            return f"Ollama model failed: {error_msg}. The model may be taking too long to respond.", "Ollama Error"

        except Exception as e: # Catch any other unexpected errors during the API call
            error_msg = f"An unexpected error occurred during Ollama API call: {e}"
            print(f"Ollama API error: {error_msg}")
            return f"Ollama model failed: {error_msg}", "Ollama Error"
        
    def _generate_rule_response(self, message: str, intent: str) -> str:
        """Generate rule-based response when LLM is not available."""
        
        responses = {
            'greeting': """Hello! 👋 How are you feeling today? 

I'm your AI Wellness Assistant. Let me know if you'd like to check in on your sleep, stress, fitness, or nutrition goals!""",

            'sleep': """I noticed you're asking about sleep! Here's what works:

1️⃣ Stick to a consistent schedule - same bedtime & wake time
2️⃣ Create a 'power down' routine 60 min before bed
3️⃣ Keep your room cool (65-68°F) and dark
4️⃣ Avoid caffeine after 2 PM
5️⃣ Try 4-7-8 breathing to fall asleep faster

Would you like me to help you create a personalized sleep schedule? 🌙""",

            'stress': """Great that you're addressing stress! Try these evidence-based techniques:

🧘 **5-Minute Reset**: Close your eyes and take 10 deep belly breaths
📝 **Brain Dump**: Write everything worrying you for 5 minutes
🚶 **Walk Away**: Step outside for 5 minutes of fresh air
🎵 **Music Therapy**: Listen to music at 60 BPM to sync brain waves

Your stress score is important feedback. Let me know if you need more coping strategies! 💪""",

            'exercise': """Getting active is key to wellness! Here's your personalized approach:

🏃 **Micro Workouts**: 5-10 min movement breaks every 2 hours
💪 **Desk Exercises**: Chair squats, wall pushups, seated leg raises
🚶 **Walking**: Aim for 8,000 steps - break into 3 walks (morning/lunch/evening)
🧘 **Stretching**: 5 min morning + 5 min evening prevents stiffness

Start small - consistency beats intensity! What sounds manageable? 🔥""",

            'nutrition': """Smart nutrition choices = better energy & focus! Here's what I recommend:

🥗 **Plate Method**: 50% veggies, 25% protein, 25% whole grains
💧 **Hydration**: Your goal is 8 cups of water - try flavoring with lemon/cucumber
⏰ **Timing**: Don't eat 3 hours before sleep
🍎 **Smart Snacks**: Nuts, fruit, yogurt instead of processed options

Would you like me to tailor a meal plan based on your diet preferences? 🥑""",

            'mental_health': """Your mental wellbeing matters! Here are some powerful strategies:

🌅 **Morning Ritual**: 2 min gratitude journaling sets a positive tone
⏸️ **Micro-Breaks**: 60 seconds of deep breathing every hour
📵 **Digital Detox**: 30 min of no screens before bed
🤝 **Connect**: Reach out to one colleague today - social bonds protect mental health

Remember: It's okay to not be okay. Your anonymized pulse helps us improve workplace wellness. ❤️""",

            'bp': """Blood pressure management is crucial for long-term health:

🩺 **Monitor**: Check BP at the same time daily (morning is best)
🧂 **Reduce Sodium**: Aim for < 2000mg/day - watch hidden salt in processed foods
🥦 **DASH Diet**: Focus on fruits, veggies, whole grains, lean proteins
🏃 **Exercise**: 30 min moderate activity 5 days/week lowers BP by 5-8 mmHg
🧘 **Stress Management**: 10 min meditation daily lowers systolic BP by 5 mmHg

Your health record shows your BP trends. Let me know if you want specific guidance! ❤️""",

            'bmi': """Let's talk about your BMI and overall wellness:

📊 **BMI is one metric**: It doesn't tell the whole story - muscle mass, body composition matter too
🎯 **Focus on habits**, not numbers: Consistent sleep, exercise, and nutrition drive results
📉 **Sustainable changes**: 0.5-1 kg per week is healthy weight management
💪 **Strength training**: Building muscle increases resting metabolism

Your wellness journey is about health, not just numbers! What aspect would you like to focus on? 🌟""",

            'general': "I'm your AI Wellness Assistant! I can help with sleep, stress, fitness, and nutrition. What's on your mind?"
        }
        
        return responses.get(intent, responses['general'])

    def chat(self, message: str, employee_id: str = None, ai_model_name: Optional[str] = None) -> Dict[str, Any]:
        """Main chat handler - tries LLM first, falls back to rule-based."""
        
        # Get health context if employee_id is provided
        context = {}
        if employee_id:
            context = self._get_context_from_db(employee_id)
        
        context_str = json.dumps(context, default=str) if context else "No specific health data available."
        
        # Get the current LLM configuration from settings
        llm_config = self._get_current_llm_config()
        
        # Detect intent
        intent = self._detect_intent(message)
        
        # Try LLM first
        llm_result = self._generate_llm_response(message, context_str, employee_id, llm_config)
        
        llm_response_text = llm_result[0] if llm_result else None
        model_used = llm_result[1] if llm_result else 'Rule-Based Fallback'
        
        # Fall back to rule-based
        response_text = llm_response_text or self._generate_rule_response(message, intent)
        
        # Generate related tips
        related_tips = []
        if intent in self.wellness_tips:
            related_tips = random.sample(self.wellness_tips[intent], min(2, len(self.wellness_tips[intent])))
        
        return {
            'response': response_text,
            'intent': intent,
            'related_tips': related_tips,
            'has_context': bool(context),
            'is_llm': llm_response_text is not None,
            'model': model_used,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
    
    def generate_daily_insights(self, employee_id: str) -> Dict[str, Any]:
        """Generate personalized daily wellness insights for an employee."""
        if self.db is None:
            return self._generate_default_insights()
        
        context = self._get_context_from_db(employee_id)
        health = context.get('health', {})
        habits = context.get('habits', {})
        mood_trend = context.get('mood_trend', [])
        
        insights = []
        nudges = []
        score = 75  # Default wellness score
        
        # Analyze sleep
        sleep_hours = health.get('sleep_hours', 7)
        if sleep_hours < 6:
            insights.append({
                'category': 'sleep',
                'severity': 'critical',
                'message': f'You averaged only {sleep_hours}h of sleep. Aim for 7-9h for optimal recovery.',
                'tip': random.choice(self.wellness_tips['sleep'])
            })
            score -= 15
        elif sleep_hours < 7:
            insights.append({
                'category': 'sleep',
                'severity': 'warning',
                'message': f'You got {sleep_hours}h of sleep. Getting to 8h can boost cognitive performance by 20%.',
                'tip': random.choice(self.wellness_tips['sleep'])
            })
            score -= 5
        
        # Analyze stress
        stress_level = health.get('stress_level', 'Medium')
        if stress_level == 'High':
            insights.append({
                'category': 'stress',
                'severity': 'critical',
                'message': 'Your stress levels are elevated. Consider taking a wellness break today.',
                'tip': random.choice(self.wellness_tips['stress'])
            })
            score -= 20
        elif stress_level == 'Medium':
            insights.append({
                'category': 'stress',
                'severity': 'info',
                'message': 'Moderate stress detected. A 5-minute breathing exercise can help reset.',
                'tip': random.choice(self.wellness_tips['stress'])
            })
            score -= 5
        
        # Analyze exercise
        exercise_hours = health.get('exercise_hours', 0)
        if exercise_hours < 1:
            insights.append({
                'category': 'exercise',
                'severity': 'warning',
                'message': f'Only {exercise_hours}h of exercise this week. Even 15min daily walk helps!',
                'tip': random.choice(self.wellness_tips['exercise'])
            })
            score -= 10
        elif exercise_hours >= 3:
            insights.append({
                'category': 'exercise',
                'severity': 'success',
                'message': f'Great work! {exercise_hours}h of exercise - keep it up!',
                'tip': random.choice(self.wellness_tips['exercise'])
            })
            score += 10
        
        # Analyze hydration
        water_cups = habits.get('water_cups', 0)
        if water_cups < 4:
            nudges.append(f'💧 Hydration alert: Only {water_cups} cups today. Target: 8 cups.')
            score -= 5
        
        # Analyze steps
        steps = habits.get('steps', 0)
        if steps < 5000:
            nudges.append(f'👣 Step goal reminder: {steps} steps so far. Aim for 10,000!')
        
        # Analyze mood trend
        if mood_trend:
            positive_moods = ['Energetic', 'Calm', 'Relaxed', 'Happy']
            negative_moods = ['Stressed', 'Tired', 'Burned', 'Anxious']
            
            recent_moods = mood_trend[-3:] if len(mood_trend) >= 3 else mood_trend
            neg_count = sum(1 for m in recent_moods if m in negative_moods)
            
            if neg_count >= 2:
                insights.append({
                    'category': 'mental_health',
                    'severity': 'warning',
                    'message': 'Your mood has been consistently low. Consider speaking with our wellness counselor.',
                    'tip': random.choice(self.wellness_tips['mental_health'])
                })
                score -= 10
            elif neg_count == 0 and len(recent_moods) >= 3:
                score += 5
        
        # Ensure score is within bounds
        score = max(0, min(100, score))
        
        # Generate wellness recommendation
        recommendation = "Keep up the great habits! You're on track for optimal wellness."
        if score < 50:
            recommendation = "Your wellness score needs attention. Focus on sleep and stress management this week."
        elif score < 70:
            recommendation = "Good baseline! Small improvements in sleep and exercise will make a big difference."
        
        return {
            'wellness_score': score,
            'insights': insights[:3],  # Top 3 most important insights
            'nudges': nudges[:2],  # Top 2 nudges
            'recommendation': recommendation,
            'generated_at': datetime.now(timezone.utc).isoformat(),
            'total_insights': len(insights),
            'active_nudges': len(nudges)
        }
    
    def analyze_burnout_trend(self, department: str = None) -> Dict[str, Any]:
        """Analyze burnout risk trends across employees or departments."""
        if self.db is None:
            return {'trend': 'stable', 'risk_level': 'low', 'message': 'Insufficient data for analysis.'}
        
        try:
            # Query health records
            query = {}
            if department:
                query['department'] = department
            
            records = list(self.db['health_records'].find(query))
            
            if not records:
                return {'trend': 'stable', 'risk_level': 'low', 'message': 'No data available for analysis.'}
            
            high_stress_count = 0
            low_sleep_count = 0
            high_bmi_count = 0
            burnout_scores = []
            
            for record in records:
                score = 0
                
                # Stress score
                stress = record.get('stressLevel', 'Low')
                if stress == 'High':
                    score += 30
                    high_stress_count += 1
                elif stress == 'Medium':
                    score += 15
                
                # Sleep
                sleep = record.get('sleepHoursPerNight', 7) or 7
                if sleep < 6:
                    score += 20
                    low_sleep_count += 1
                elif sleep < 7:
                    score += 10
                
                # BMI
                bmi = record.get('bmi', 24) or 24
                if bmi >= 30:
                    score += 15
                    high_bmi_count += 1
                elif bmi >= 25:
                    score += 5
                
                # Exercise
                exercise = record.get('exerciseHoursPerWeek', 0) or 0
                if exercise < 1:
                    score += 10
                elif exercise < 2:
                    score += 5
                
                burnout_scores.append(score)
            
            avg_score = sum(burnout_scores) / len(burnout_scores) if burnout_scores else 0
            
            # Determine risk level
            if avg_score >= 50:
                risk_level = 'high'
                trend = 'increasing'
            elif avg_score >= 30:
                risk_level = 'medium'
                trend = 'stable'
            else:
                risk_level = 'low'
                trend = 'decreasing'
            
            total = len(records)
            
            return {
                'trend': trend,
                'risk_level': risk_level,
                'average_burnout_score': round(avg_score, 1),
                'total_employees_analyzed': total,
                'high_stress_percentage': round((high_stress_count / total) * 100, 1) if total else 0,
                'low_sleep_percentage': round((low_sleep_count / total) * 100, 1) if total else 0,
                'high_bmi_percentage': round((high_bmi_count / total) * 100, 1) if total else 0,
                'recommendation': self._get_burnout_recommendation(risk_level, avg_score),
                'risk_distribution': {
                    'high_risk': sum(1 for s in burnout_scores if s >= 50),
                    'medium_risk': sum(1 for s in burnout_scores if 30 <= s < 50),
                    'low_risk': sum(1 for s in burnout_scores if s < 30),
                }
            }
            
        except Exception as e:
            print(f"Error analyzing burnout trend: {e}")
            return {'trend': 'unknown', 'risk_level': 'unknown', 'message': str(e)}
    
    def _get_burnout_recommendation(self, risk_level: str, score: float) -> str:
        """Get recommendation based on burnout risk level."""
        recommendations = {
            'high': f'🚨 CRITICAL: Burnout risk score is {score:.0f}/100. Immediate intervention needed. Recommend mandatory wellness days, counseling sessions, and workload review for affected departments.',
            'medium': f'⚠️ ELEVATED: Burnout risk at {score:.0f}/100. Proactive measures recommended: implement stress management workshops, encourage break schedules, and monitor workload distribution.',
            'low': f'✅ LOW RISK: Score is {score:.0f}/100. Maintain current wellness programs. Continue monitoring for early warning signs.',
        }
        return recommendations.get(risk_level, 'Continue standard wellness monitoring.')
    
    def generate_daily_routine(self, employee_id: str, preferences: Dict = None) -> Dict[str, Any]:
        """Generate a personalized daily wellness routine."""
        context = {}
        if self.db is not None and employee_id:
            context = self._get_context_from_db(employee_id)
        
        context_str = json.dumps(context, default=str) if context else "No specific health data available."
        prefs_str = json.dumps(preferences, default=str) if preferences else "No specific user preferences."

        prompt = f"""You are an expert AI Wellness Coach.
You have access to this employee's health data: {context_str}
User's preferences: {prefs_str}

Generate a simple, actionable, and personalized one-day wellness routine for this employee.
The routine should be broken down into "morning", "afternoon", and "evening".
Each section should contain a list of 2-4 brief, string-based activity suggestions.

The output must be a valid JSON object with the following structure, and nothing else. Do not include markdown formatting like ```json.
{{
  "morning": ["Activity 1", "Activity 2", "Activity 3"],
  "afternoon": ["Activity 1", "Activity 2"],
  "evening": ["Activity 1", "Activity 2", "Activity 3"]
}}

Focus on practical, evidence-based wellness tips that a working professional can easily integrate.
Tailor the suggestions based on the provided health data (e.g., if stress is high, include more mindfulness; if sleep is low, focus on wind-down activities).
{AI_POLICY_GUARDRAIL}
"""
        
        llm_config = self._get_current_llm_config()
        llm_result = self._generate_llm_response(prompt, context_str, employee_id, llm_config)
        llm_response_str = llm_result[0] if llm_result else None
        
        if llm_response_str:
            try:
                plan = self._parse_json_from_llm(llm_response_str)
                plan['generatedAt'] = datetime.now(timezone.utc).isoformat()
                return plan
            except json.JSONDecodeError:
                print("AI service returned invalid JSON for routine. Falling back to rule-based.")

        # Fallback to a simple rule-based plan if LLM fails
        return {
            'morning': [
                "Wake up, drink a glass of water.",
                "5-minute stretching or light yoga.",
                "Eat a protein-rich breakfast."
            ],
            'afternoon': [
                "Take a 15-minute walk after lunch.",
                "Practice 2 minutes of deep breathing at your desk."
            ],
            'evening': [
                "30-minute workout (cardio or strength).",
                "Eat a light dinner at least 2 hours before bed.",
                "Read a book or listen to calm music (no screens)."
            ],
'generatedAt': datetime.now(timezone.utc).isoformat(),
        }

    # Guidance for each supported diet type so the LLM tailors the plan correctly.
    DIET_TYPE_GUIDANCE = {
        'Vegetarian': (
            "The user is strictly VEGETARIAN. Do NOT include any meat, fish, poultry, or eggs. "
            "Use plant-based proteins such as paneer, tofu, lentils (dal), chickpeas, beans, and legumes. "
            "Dairy products like milk, curd, and paneer are allowed."
        ),
        'Vegan': (
            "The user follows a VEGAN diet. Do NOT include any animal products: no meat, fish, eggs, "
            "dairy (milk, cheese, curd, butter, ghee, paneer), or honey. Use plant-based protein sources "
            "such as tofu, chickpeas, lentils, beans, quinoa, nuts, and seeds. Use plant milks (soy/oat/almond)."
        ),
        'Non-Veg': (
            "The user follows a NON-VEGETARIAN diet and can eat meat, fish, and eggs. "
            "Include lean protein sources such as grilled chicken, fish (e.g., salmon/tuna), and eggs alongside "
            "whole grains and vegetables."
        ),
        'Diabetic': (
            "The user has DIABETES. The plan must be low-glycemic and sugar-free. Avoid white rice, refined "
            "sugar, sugary drinks, and processed carbs. Use whole grains (brown rice, millet, oats), high-fiber "
            "vegetables, legumes, and lean/plant proteins. Keep portions consistent and spread carbs evenly."
        ),
        'Weight Loss': (
            "The user wants to LOSE WEIGHT. Keep the plan calorie-controlled and low-calorie (approx 1200-1500 kcal/day). "
            "Prioritize high-protein, high-fiber foods, plenty of vegetables, and minimal refined carbs and oils. "
            "Avoid fried foods, sugary drinks, and heavy desserts."
        ),
'Weight Gain': (
            "The user wants to GAIN WEIGHT. Make the plan calorie-dense and high-protein (approx 2500-3000 kcal/day). "
            "Include healthy fats (nuts, seeds, avocado, ghee/olive oil), complex carbs (rice, whole grains), dairy, "
            "and protein-rich foods. Add healthy snacks between meals."
        ),
    }

    # Rule-based fallback meal plans for each supported diet type (used when the LLM is unavailable).
    RULE_BASED_DIET_PLANS = {
        'Vegetarian': {
            'breakfast': ['Oats with milk and fruit', 'Handful of nuts'],
            'lunch': ['Roti/Rice', 'Dal (Lentil soup)', 'Mixed vegetable curry', 'Salad'],
            'dinner': ['Quinoa with grilled vegetables', 'Curd/Yogurt'],
            'snacks': ['Apple', 'Buttermilk'],
            'calories': '1800-2000 kcal',
            'protein': '60-70g',
            'waterIntakeLitres': 3,
            'notes': 'This is a general vegetarian plan. For a more personalized AI plan, please try again later.',
        },
        'Vegan': {
            'breakfast': ['Oats with soy/almond milk and fruit', 'Handful of nuts'],
            'lunch': ['Brown rice', 'Chickpea curry', 'Stir-fried vegetables', 'Lentil salad'],
            'dinner': ['Quinoa with roasted vegetables', 'Tofu stir-fry'],
            'snacks': ['Apple', 'Roasted chana'],
            'calories': '1800-2000 kcal',
            'protein': '55-65g',
            'waterIntakeLitres': 3,
            'notes': 'This is a general vegan plan with no animal products. For a more personalized AI plan, please try again later.',
        },
        'Non-Veg': {
            'breakfast': ['Egg omelette with whole wheat toast', 'Fruit and a glass of milk'],
            'lunch': ['Brown rice', 'Grilled chicken', 'Mixed vegetable curry', 'Salad'],
            'dinner': ['Grilled fish (salmon/tuna)', 'Quinoa', 'Steamed vegetables'],
            'snacks': ['Boiled eggs', 'Mixed nuts'],
            'calories': '2000-2200 kcal',
            'protein': '80-90g',
            'waterIntakeLitres': 3,
            'notes': 'This is a general non-vegetarian plan with lean proteins. For a more personalized AI plan, please try again later.',
        },
        'Diabetic': {
            'breakfast': ['Oats/steel-cut oatmeal with nuts and seeds', 'Black coffee/tea without sugar'],
            'lunch': ['Millet/brown rice', 'Dal (Lentil soup)', 'Mixed vegetable curry', 'Green salad'],
            'dinner': ['Whole wheat roti', 'Paneer/tofu and vegetable curry', 'Curd/Yogurt'],
            'snacks': ['Roasted chana or nuts', 'Buttermilk'],
            'calories': '1600-1800 kcal',
            'protein': '65-75g',
            'waterIntakeLitres': 3,
            'notes': 'This is a low-glycemic, sugar-free plan suited for diabetes. For a more personalized AI plan, please try again later.',
        },
        'Weight Loss': {
            'breakfast': ['Vegetable poha/vegetable oats', 'Green tea'],
            'lunch': ['Brown rice or 2 rotis', 'Dal (Lentil soup)', 'Large mixed vegetable curry', 'Salad'],
            'dinner': ['Grilled paneer/tofu/chicken', 'Steamed vegetables', 'Buttermilk'],
            'snacks': ['Fresh fruit', 'Roasted chana'],
            'calories': '1200-1500 kcal',
            'protein': '60-70g',
            'waterIntakeLitres': 3,
            'notes': 'This is a calorie-controlled plan for weight loss. For a more personalized AI plan, please try again later.',
        },
        'Weight Gain': {
            'breakfast': ['Banana and peanut butter oats', 'Whole eggs/upma', 'Glass of whole milk'],
            'lunch': ['Rice', 'Dal', 'Paneer/vegetable curry', 'Ghee roasted roti', 'Curd'],
            'dinner': ['Whole wheat roti', 'Chicken/paneer curry', 'Rice', 'Salad with olive oil'],
            'snacks': ['Nuts and seeds trail mix', 'Milkshake/smoothie', 'Nut butter sandwich'],
            'calories': '2500-3000 kcal',
            'protein': '90-100g',
            'waterIntakeLitres': 3,
            'notes': 'This is a calorie-dense, high-protein plan for weight gain. For a more personalized AI plan, please try again later.',
        },
        'Balanced': {
            'breakfast': ['Oats with milk and fruit', 'Handful of nuts'],
            'lunch': ['Roti/Rice', 'Dal (Lentil soup)', 'Mixed vegetable curry', 'Salad'],
            'dinner': ['Quinoa with grilled vegetables', 'Curd/Yogurt'],
            'snacks': ['Apple', 'Buttermilk'],
            'calories': '1800-2000 kcal',
            'protein': '60-70g',
            'waterIntakeLitres': 3,
            'notes': 'This is a general healthy plan. For a more personalized AI plan, please try again later.',
        },
    }

    def generate_diet_plan(self, employee_id: str, preferences: Dict = None) -> Dict[str, Any]:
        """Generates a personalized diet plan using AI."""
        context = {}
        if self.db is not None and employee_id:
            context = self._get_context_from_db(employee_id)
        
        health = context.get('health', {})
        prefs = preferences or {}
        diet_type = prefs.get('dietType', 'Balanced')
        
        context_str = json.dumps(context, default=str) if context else "No specific health data available."

        # Diet-type-specific instruction pulled from the guidance map.
        diet_guidance = self.DIET_TYPE_GUIDANCE.get(
            diet_type,
            "The user follows a balanced diet with no specific restrictions. Include a variety of whole foods."
        )

        prompt = f"""You are an expert AI Nutritionist for a corporate wellness platform.
You have access to this employee's health data: {context_str}

User's diet preference: {diet_type}

DIET RESTRICTION / GOAL (MUST follow strictly):
{diet_guidance}

Generate a one-day meal plan for this employee. The plan must be simple, practical for a working professional, and aligned with Indian cuisine unless specified otherwise. Every meal item MUST comply with the diet restriction/goal described above.

The output must be a valid JSON object with the following structure, and nothing else. Do not include markdown formatting like ```json.
{{
  "dietType": "{diet_type}",
  "breakfast": ["Item 1", "Item 2"],
  "lunch": ["Item 1", "Item 2", "Item 3"],
  "dinner": ["Item 1", "Item 2"],
  "snacks": ["Item 1", "Item 2"],
  "calories": "Approximate total calories (e.g., '1800-2000 kcal')",
  "protein": "Approximate total protein (e.g., '70-80g')",
  "waterIntakeLitres": 3,
  "notes": "A brief, encouraging note about the plan."
}}

Focus on whole foods. Be specific with meal items and ensure they respect the diet restriction/goal.
{AI_POLICY_GUARDRAIL}
"""
        
        llm_config = self._get_current_llm_config()
        llm_result = self._generate_llm_response(prompt, context_str, employee_id, llm_config)
        llm_response_str = llm_result[0] if llm_result else None
        
        if llm_response_str:
            try:
                plan = self._parse_json_from_llm(llm_response_str)
                # Only accept the LLM plan if it complies with the selected diet type.
                compliant_plan = self._validate_diet_plan(diet_type, plan)
                if compliant_plan is not None:
                    compliant_plan['generatedAt'] = datetime.now(timezone.utc).isoformat()
                    return compliant_plan
                print(f"AI returned a diet plan that does not comply with '{diet_type}'. Falling back to rule-based.")
            except json.JSONDecodeError:
                print("AI service returned invalid JSON for diet plan. Falling back to rule-based.")

        # Fallback to a diet-type-specific rule-based plan if LLM fails
        fallback_plan = self.RULE_BASED_DIET_PLANS.get(diet_type, self.RULE_BASED_DIET_PLANS['Balanced'])
        return {
            'dietType': diet_type,
            'breakfast': fallback_plan['breakfast'],
            'lunch': fallback_plan['lunch'],
            'dinner': fallback_plan['dinner'],
            'snacks': fallback_plan['snacks'],
            'calories': fallback_plan['calories'],
            'protein': fallback_plan['protein'],
            'waterIntakeLitres': fallback_plan['waterIntakeLitres'],
            'notes': fallback_plan['notes'],
            'generatedAt': datetime.now(timezone.utc).isoformat(),
        }

    def _parse_json_from_llm(self, llm_output: str) -> Dict:
        """Extracts a JSON object from a string that might contain markdown code fences."""
        # Find the start and end of the JSON block
        start = llm_output.find('{')
        end = llm_output.rfind('}') + 1
        json_str = llm_output[start:end]
        return json.loads(json_str)

    def _validate_diet_plan(self, diet_type: str, plan: Dict) -> Optional[Dict]:
        """Validate that an LLM-generated meal plan complies with the selected diet type.

        Checks the meal items for foods that are not allowed for the given diet type.
        Returns the plan unchanged if it complies, otherwise returns None so the caller
        can fall back to the rule-based plan for that diet type.
        """
        if not isinstance(plan, dict):
            return None

        # Collect all meal item text for keyword checking.
        meal_items = []
        for key in ('breakfast', 'lunch', 'dinner', 'snacks'):
            items = plan.get(key)
            if isinstance(items, list):
                meal_items.extend(str(item).lower() for item in items)
            elif isinstance(items, str):
                meal_items.append(items.lower())

        combined = ' '.join(meal_items)

        # Non-vegetarian / animal products that must NOT appear for veg/vegan.
        animal_terms = [
            'chicken', 'mutton', 'lamb', 'pork', 'bacon', 'ham', 'beef', 'turkey',
            'sausage', 'steak', 'meat', 'fish', 'salmon', 'tuna', 'prawn', 'shrimp',
            'crab', 'egg', 'eggs', 'omelette', 'omelet'
        ]
        # Dairy terms (allowed for vegetarian, NOT allowed for vegan).
        dairy_terms = [
            'milk', 'cheese', 'paneer', 'curd', 'yogurt', 'yoghurt', 'butter',
            'ghee', 'buttermilk', 'dahi', 'cream'
        ]

        if diet_type == 'Vegan':
            if any(term in combined for term in animal_terms + dairy_terms):
                return None
        elif diet_type == 'Vegetarian':
            if any(term in combined for term in animal_terms):
                return None
        elif diet_type == 'Diabetic':
            # No-added-sugar check: flag obvious sugar sources.
            if any(term in combined for term in ['sugar', 'sweets', 'dessert', 'jaggery', 'milk shake', 'milkshake', 'soft drink', 'cola']):
                return None

        # Weight Loss / Weight Gain / Non-Veg / Balanced / others: accept as-is.
        return plan

    def _get_focus_areas(self, health: Dict) -> List[str]:
        """Determine areas the user should focus on."""
        focus = []
        if health.get('stress_level') == 'High':
            focus.append('Stress Management')
        if (health.get('sleep_hours') or 7) < 7:
            focus.append('Sleep Improvement')
        if (health.get('exercise_hours') or 0) < 2:
            focus.append('Physical Activity')
        if (health.get('bmi') or 24) >= 25:
            focus.append('Weight Management')
        if not focus:
            focus.append('Maintain Current Habits')
        return focus
    
    def _generate_default_insights(self) -> Dict[str, Any]:
        """Default insights when DB is not available."""
        return {
            'wellness_score': 85,
            'insights': [
                {
                    'category': 'general',
                    'severity': 'info',
                    'message': 'Welcome to your AI Wellness Assistant! Start tracking your health to get personalized insights.',
                    'tip': 'Log your daily water intake and steps to receive proactive nudges.'
                }
            ],
            'nudges': ['💡 Start by filling in your health profile for personalized insights.'],
            'recommendation': 'Complete your health profile to unlock AI-powered wellness insights.',
            'generated_at': datetime.now(timezone.utc).isoformat(),
            'total_insights': 1,
            'active_nudges': 1
        }
    
    def _add_time(self, time_str: str, minutes: int) -> str:
        """Add minutes to a time string."""
        try:
            parts = time_str.replace('AM', '').replace('PM', '').strip().split(':')
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            
            is_pm = 'PM' in time_str.upper()
            if is_pm and hour != 12:
                hour += 12
            
            total_minutes = hour * 60 + minute + minutes
            new_hour = (total_minutes // 60) % 24
            new_minute = total_minutes % 60
            
            period = 'AM' if new_hour < 12 else 'PM'
            if new_hour == 0:
                new_hour = 12
            elif new_hour > 12:
                new_hour -= 12
            
            return f"{new_hour}:{new_minute:02d} {period}"
        except:
            return time_str
    
    def _subtract_time_from_sleep(self, sleep_hours: float) -> str:
        """Calculate wind down time based on target sleep hours."""
        if sleep_hours >= 8:
            return '10:00 PM'
        elif sleep_hours >= 7:
            return '10:30 PM'
        else:
            return '11:00 PM'
    
    def _get_sleep_time(self, sleep_hours: float) -> str:
        """Calculate sleep time based on target hours."""
        if sleep_hours >= 8:
            return '11:00 PM'
        elif sleep_hours >= 7:
            return '11:30 PM'
        else:
            return '12:00 AM'


# Singleton instance
_ai_service_instance = None

def get_ai_service(db=None, risk_model=None, recommendation_engine=None):
    """Get or create the AI Wellness service singleton."""
    global _ai_service_instance
    if _ai_service_instance is None:
        _ai_service_instance = AIWellnessService(db, risk_model, recommendation_engine)
    return _ai_service_instance

def get_ai_diet_plan(employee_id: str, preferences: Dict = None) -> Dict[str, Any]:
    """Convenience function to generate a diet plan."""
    service = get_ai_service()
    return service.generate_diet_plan(employee_id, preferences)
