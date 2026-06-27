from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import cohere

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

co = cohere.ClientV2(api_key="cohere_L85LX58VbdgFThve8HIGLuoMKGJ7mg4r8QjPgYch4K5lzp")

class TaskRequest(BaseModel):
    tasks: str
    mood: str = "Medium"
    priorities: str = ""

@app.get("/")
def home():
    return {"message": "Zenit API is running!"}

@app.post("/schedule")
def generate_schedule(request: TaskRequest):
    prompt = f"""
    You are Zenit, an AI productivity assistant.
    The user has these tasks: {request.tasks}
    User's current energy level: {request.mood}
    High priority tasks: {request.priorities if request.priorities else "None specified"}

    Rules:
    - If energy is Low: schedule light tasks first, add more breaks
    - If energy is High: schedule hardest tasks first
    - If energy is Medium: balanced schedule
    - Place high priority tasks at peak hours (morning)
    - Format EXACTLY like this for each task:
    TIME | TASK NAME | tip: your tip here

    Example:
    7:00 AM - 8:00 AM | Study DSA | tip: Use Pomodoro technique for better focus
    8:00 AM - 9:00 AM | Gym | tip: Stay hydrated throughout your workout

    Be motivating and practical.
    """
    response = co.chat(
        model="command-a-03-2025",
        messages=[{"role": "user", "content": prompt}]
    )
    return {"schedule": response.message.content[0].text}