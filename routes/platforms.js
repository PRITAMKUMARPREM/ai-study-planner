const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

// Helper to add or increment counts in the aggregated map
function addCountToMap(dateStr, count, aggregatedMap) {
    if (!aggregatedMap[dateStr]) {
        aggregatedMap[dateStr] = 0;
    }
    aggregatedMap[dateStr] += count;
}

// Convert Unix timestamp (in seconds) to YYYY-MM-DD
function formatUnixDate(unixTime) {
    const d = new Date(unixTime * 1000);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${day}`;
}

// Route to fetch and aggregate heatmap data
router.get('/heatmap', async (req, res) => {
    const { leetcode, codeforces, gfg } = req.query;

    // This will hold the aggregated counts: { "YYYY-MM-DD": count }
    const heatmapData = {};

    try {
        // 1. LeetCode (Using public alfa proxy API)
        if (leetcode) {
            try {
                const lcResponse = await axios.get(`https://alfa-leetcode-api.onrender.com/${leetcode}/calendar`);
                if (lcResponse.data && lcResponse.data.submissionCalendar) {
                    const calendarStr = lcResponse.data.submissionCalendar;
                    const calendar = JSON.parse(calendarStr);
                    for (const [timestamp, count] of Object.entries(calendar)) {
                        const dateStr = formatUnixDate(parseInt(timestamp));
                        addCountToMap(dateStr, count, heatmapData);
                    }
                }
            } catch (err) {
                console.error("Error fetching LeetCode data:", err.message);
            }
        }

        // 2. CodeForces (Using official public API)
        if (codeforces) {
            try {
                // Fetch user status (submissions). We might need a large count to get a full year
                // but let's take the last 1000 for efficiency
                const cfResponse = await axios.get(`https://codeforces.com/api/user.status?handle=${codeforces}&from=1&count=1000`);
                if (cfResponse.data && cfResponse.data.status === 'OK') {
                    for (const sub of cfResponse.data.result) {
                        const dateStr = formatUnixDate(sub.creationTimeSeconds);
                        addCountToMap(dateStr, 1, heatmapData);
                    }
                }
            } catch (err) {
                console.error("Error fetching CodeForces data:", err.message);
            }
        }

        // 3. GeeksForGeeks (Scraping the profile page SVG/calendar)
        if (gfg) {
            try {
                const gfgResponse = await axios.get(`https://www.geeksforgeeks.org/user/${gfg}/`);
                const $ = cheerio.load(gfgResponse.data);

                // GFG usually renders a heat map in an svg with class .js-calendar-graph-svg or similar, 
                // but recently they use React. Let's find script tags carrying NEXT_DATA or look for standard rects.
                // Assuming standard SVG rect element structure containing date and count attributes:
                $('rect.heatmap-day').each((i, el) => {
                    const dateStr = $(el).attr('data-date');
                    const count = parseInt($(el).attr('data-count') || '0', 10);
                    if (dateStr && count > 0) {
                        addCountToMap(dateStr, count, heatmapData);
                    }
                });
            } catch (err) {
                console.error("Error fetching GFG data:", err.message);
            }
        }

        res.json({ success: true, data: heatmapData });

    } catch (globalError) {
        console.error("Global heatmap aggregation error:", globalError);
        res.status(500).json({ success: false, error: "Failed to fetch heatmap data" });
    }
});

module.exports = router;
