"""
AI Wellness Service - Provides intelligent wellness insights, chat, and predictions.
Uses a hybrid approach: rule-based reasoning + optional LLM integration.
"""

import os
import json
import random
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, List, Any
from ai_policy import AI_POLICY_GUARDRAIL
from dotenv import load_dotenv
load_dotenv()

# Optional: OpenAI integration
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# Optional: Ollama integration (local LLM - privacy focused)
try:
    import requests as http_requests
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False

# Optional: Google Gemini integration
try:
    import google.genai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


class AIWellnessService:
    """AI-powered wellness assistant service."""
    
    def __init__(self, db=None, risk_model=None, recommendation_engine=None):
        self.db = db
        self.risk_model = risk_model
        self.recommendation_engine = recommendation_engine
        
        # LLM configuration
        self.llm_provider = os.getenv('AI_LLM_PROVIDER', 'gemini')  # 'openai', 'ollama', 'gemini', 'none'
        self.openai_api_key = os.getenv('OPENAI_API_KEY', '')
        self.ollama_base_url = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
        self.ollama_model = os.getenv('OLLAMA_MODEL', 'llama3.2')
        self.gemini_api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY', '')
        
        # Initialize Gemini if available
        if self.llm_provider == 'gemini' and self.gemini_api_key and GEMINI_AVAILABLE:
            try:
                # NEW SYNTAX: Create a Client for the new google.genai SDK
                self.gemini_client = genai.Client(api_key=self.gemini_api_key)
            except Exception as e:
                print(f"Gemini initialization error: {e}")
                self.gemini_client = None
        
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
    
    def _generate_llm_response(self, message: str, context: str, employee_id: str) -> Optional[str]:
        """Try to get response from LLM provider."""
        
        # Try OpenAI
        if self.llm_provider == 'openai' and self.openai_api_key and OPENAI_AVAILABLE:
            try:
                openai.api_key = self.openai_api_key
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": f"""You are an expert AI Wellness Coach for a corporate wellness platform. 
You have access to this employee's health data: {context}

Provide concise, actionable wellness advice. Be supportive and evidence-based.
Keep responses under 150 words. Focus on practical tips the employee can implement immediately.
{AI_POLICY_GUARDRAIL}"""},
                        {"role": "user", "content": message}
                    ],
                    max_tokens=300,
                    temperature=0.7
                )
                return response.choices[0].message.content
            except Exception as e:
                print(f"OpenAI API error: {e}")
        
        # Try Ollama (local)
        if self.llm_provider == 'ollama' and OLLAMA_AVAILABLE:
            try:
                response = http_requests.post(
                    f"{self.ollama_base_url}/api/generate",
                    json={
                        "model": self.ollama_model,
                        "prompt": f"""Context (Employee Health Data): {context}

User message: {message}

As an AI Wellness Coach, provide a helpful, concise response (max 150 words) with practical wellness advice.
{AI_POLICY_GUARDRAIL}""",
                        "stream": False,
                        "max_tokens": 300
                    },
                    timeout=10
                )
                if response.status_code == 200:
                    return response.json().get('response', '')
            except Exception as e:
                print(f"Ollama API error: {e}")
        
        # Try Google Gemini
        if self.llm_provider == 'gemini' and hasattr(self, 'gemini_client') and self.gemini_client:
                prompt = f"""You are an expert AI Wellness Coach for a corporate wellness platform called "Employee Wellness Management Analytics". 
You have access to this employee's health data: {context}

User message: {message}

Provide concise, actionable wellness advice. Be supportive, empathetic, and evidence-based.
Keep responses under 150 words. Focus on practical tips the employee can implement immediately.
Use emojis sparingly but effectively to make the response engaging.
{AI_POLICY_GUARDRAIL}"""
                
                # Iterate through a list of models to handle deprecations and availability
                model_candidates = ["gemini-3.5-flash"]
                for model in model_candidates:
                    try:
                        gemini_response = self.gemini_client.models.generate_content(
                            model=f'models/{model}', # Use the full model name format
                            contents=prompt
                        )
                        if gemini_response and gemini_response.text:
                            print(f"Successfully used Gemini model: {model}")
                            return gemini_response.text.strip()
                    except Exception as e:
                        print(f"Gemini model '{model}' failed: {e}. Trying next model...")
                        continue # Try the next model in the list
        
        return None
    
    def _generate_rule_response(self, message: str, intent: str) -> str:
        """Generate rule-based response when LLM is not available."""
        
        responses = {
            'greeting': """Hello! 👋 How are you feeling today? 

I'm your AI Wellness Coach. Let me know if you'd like to check in on your sleep, stress, fitness, or nutrition goals!""",

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

            'routine': """Here's your optimal daily routine based on wellness science:

🌅 **Morning (6-8 AM)**: Wake up same time, drink water, 5 min stretch, healthy breakfast
💼 **Work Blocks (9-12 PM)**: 90 min focus sessions with 5 min breaks
🥗 **Lunch (12-1 PM)**: Balanced meal, 10 min walk after
⚡ **Afternoon (2-4 PM)**: Micro-breaks every 60 min (stand, stretch, breathe)
🌇 **Evening (5-7 PM)**: Exercise window, dinner (3h before sleep)
🌙 **Wind Down (8-10 PM)**: No screens, reading, meditation, consistent bedtime

Want me to customize this for your schedule? ⏰""",

            'general': """I'm your AI Wellness Coach! I can help you with:

🗣️ **Voice Commands**: Try clicking the microphone and saying "How's my health?"
🌙 **Sleep Optimization**: Tips for better rest based on your patterns
🧘 **Stress Management**: Breathing exercises and coping strategies
🏃 **Fitness Guidance**: Personalized workout suggestions
🥗 **Nutrition Advice**: Meal planning and healthy eating tips
📊 **Health Insights**: Analysis of your wellness trends

What would you like to explore today? I'm here to support your wellness journey! 🌟"""
        }
        
        return responses.get(intent, responses['general'])
    
    def chat(self, message: str, employee_id: str = None) -> Dict[str, Any]:
        """Main chat handler - tries LLM first, falls back to rule-based."""
        
        # Get health context if employee_id is provided
        context = {}
        if employee_id:
            context = self._get_context_from_db(employee_id)
        
        context_str = json.dumps(context, default=str) if context else "No specific health data available."
        
        # Detect intent
        intent = self._detect_intent(message)
        
        # Try LLM first
        llm_response = None
        if self.llm_provider != 'none':
            llm_response = self._generate_llm_response(message, context_str, employee_id)
        
        # Fall back to rule-based
        response_text = llm_response or self._generate_rule_response(message, intent)
        
        # Generate related tips
        related_tips = []
        if intent in self.wellness_tips:
            related_tips = random.sample(self.wellness_tips[intent], min(2, len(self.wellness_tips[intent])))
        
        return {
            'response': response_text,
            'intent': intent,
            'related_tips': related_tips,
            'has_context': bool(context),
            'is_llm': llm_response is not None,
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
        
        health = context.get('health', {})
        habits = context.get('habits', {})
        
        # Extract health metrics
        sleep_hours = float(health.get('sleep_hours', 7) or 7)
        stress_level = health.get('stress_level', 'Medium')
        exercise_hours = health.get('exercise_hours', 0)
        bmi = health.get('bmi', 24)
        
        # Adjust timing based on preferences or defaults
        wake_time = (preferences or {}).get('wake_time', '6:30 AM')
        work_start = (preferences or {}).get('work_start', '9:00 AM')

        # Initialize the routine dictionary with keys for each period
        routine_data = {
            'morning': [],
            'afternoon': [],
            'evening': []
        }
        
        # Generate personalized routine blocks
        routine = []
        
        # Morning block
        routine.append({
            'time': wake_time,
            'title': '🌅 Wake Up & Hydrate',
            'description': 'Drink 500ml water with lemon. 5 min gentle stretching.',
            'duration': '15 min',
            'type': 'wellness'
        }) # This is a temporary list, will be sorted later
        
        routine.append({
            'time': self._add_time(wake_time, 30),
            'title': '🧘 Morning Mindfulness',
            'description': '5 min meditation + 2 min gratitude journaling. Sets positive tone for the day.',
            'duration': '10 min',
            'type': 'mental_health' if stress_level == 'High' else 'wellness'
        })
        
        # Breakfast
        routine.append({
            'time': self._add_time(wake_time, 60),
            'title': '🥗 Nutritious Breakfast',
            'description': 'Include protein (eggs/yogurt) + complex carbs (oats) + fruit.',
            'duration': '20 min',
            'type': 'nutrition'
        })
        
        # Work blocks
        routine.append({
            'time': work_start,
            'title': '💼 Focus Work Block 1',
            'description': '90 min focused work. Put phone away. Single task.',
            'duration': '90 min',
            'type': 'work'
        })
        
        routine.append({
            'time': self._add_time(work_start, 90),
            'title': '☕ Micro-Break',
            'description': 'Stand up. 2 min stretch. Walk around. Refill water.',
            'duration': '10 min',
            'type': 'break'
        })
        
        # Mid-morning
        if exercise_hours < 2:
            routine.append({
                'time': '11:00 AM',
                'title': '🚶 Movement Snack',
                'description': '5 min brisk walk or 10 desk exercises. Boosts energy and focus.',
                'duration': '10 min',
                'type': 'exercise'
            })
        
        # Lunch
        routine.append({
            'time': '12:30 PM',
            'title': '🥗 Lunch Break (Tech-Free)',
            'description': 'Eat without screens. 10 min walk after meals improves digestion.',
            'duration': '45 min',
            'type': 'nutrition'
        })
        
        # Afternoon
        routine.append({
            'time': '2:00 PM',
            'title': '💼 Focus Work Block 2',
            'description': '60 min focused work. Energy dip is normal - try standing desk.',
            'duration': '60 min',
            'type': 'work'
        })
        
        routine.append({
            'time': '3:30 PM',
            'title': '⚡ Energy Reset',
            'description': '5 min breathing exercise (box breathing). Snack: nuts + fruit.',
            'duration': '15 min',
            'type': 'break'
        })
        
        # Exercise recommendation
        routine.append({
            'time': '5:30 PM',
            'title': '🏋️ Exercise Window',
            'description': f'30 min activity. Your preference: {"walking" if exercise_hours < 1 else "mix of cardio and strength"}. Best time for workout.',
            'duration': '30-45 min',
            'type': 'exercise'
        })
        
        # Dinner
        routine.append({
            'time': '7:30 PM',
            'title': '🥘 Light Dinner',
            'description': 'Eat 3 hours before bed. Focus on vegetables and lean protein.',
            'duration': '30 min',
            'type': 'nutrition'
        })
        
        # Wind down
        wind_down_time = self._subtract_time_from_sleep(sleep_hours)
        routine.append({
            'time': wind_down_time,
            'title': '🌙 Wind Down Routine',
            'description': 'No screens. Read a book, take a warm bath, gentle stretching. Dim lights.',
            'duration': '60 min',
            'type': 'sleep'
        })
        
        # Sleep
        sleep_time = self._get_sleep_time(sleep_hours)
        routine.append({
            'time': sleep_time,
            'title': '😴 Sleep',
            'description': f'Target: {sleep_hours}h of quality sleep. Keep room cool (65-68°F) and dark.',
            'duration': f'{sleep_hours}h',
            'type': 'sleep'
        })

        # Distribute activities into morning, afternoon, evening based on time
        for activity in routine:
            time_str = activity['time']
            hour = int(time_str.split(':')[0])
            is_pm = 'PM' in time_str.upper()

            if not is_pm and hour < 12:
                routine_data['morning'].append(activity['description'])
            elif (is_pm and hour < 6) or (not is_pm and hour == 12):
                routine_data['afternoon'].append(activity['description'])
            else:
                routine_data['evening'].append(activity['description'])
        
        return {
            'morning': routine_data['morning'],
            'afternoon': routine_data['afternoon'],
            'evening': routine_data['evening'],
            'total_activities': len(routine),
            'generated_for': employee_id,
            'generated_at': datetime.now(timezone.utc).isoformat(),
            'focus_areas': self._get_focus_areas(health)
        }
    
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
                    'message': 'Welcome to your AI Wellness Coach! Start tracking your health to get personalized insights.',
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
