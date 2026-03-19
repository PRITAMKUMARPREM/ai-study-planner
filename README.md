# 🎓 AI Study Planner

A smart, AI-powered study planner built with Node.js + Express. Features include:

- 📊 **Weekly Performance Chart** — track quiz scores over time
- 🏆 **Dynamic Leaderboard** — XP-based ranking with real-time updates
- 🤖 **AI Tutor** — generate mock quizzes and get explanations (powered by Google Gemini)
- ⏱ **Focus Mode Timer** — distraction-free study sessions with XP rewards
- 🗓 **Smart Planner** — AI-generated study schedules with deadlines
- 🔥 **Learning Heatmap** — activity tracked every day you open the app
- 📈 **Analytics Dashboard** — subject mastery, activity score, and streaks

## 🚀 Getting Started (Local)

```bash
npm install
```

Create a `.env` file in the root:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

Then run:
```bash
node server.js
```

Open [http://localhost:5001](http://localhost:5001) in your browser.

## 🌐 Deployment

Deployed on [Render.com](https://render.com). Set the `GEMINI_API_KEY` environment variable in your Render service settings.

## 🛠 Tech Stack

- **Frontend**: HTML, Tailwind CSS, Chart.js, Vanilla JS
- **Backend**: Node.js, Express
- **AI**: Google Gemini API
- **Storage**: localStorage (client-side)
