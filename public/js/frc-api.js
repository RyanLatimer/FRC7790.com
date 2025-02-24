// FRC API Configuration
const FRC_TEAM_KEY = "frc7790";
const TBA_AUTH_KEY =
  "gdgkcwgh93dBGQjVXlh0ndD4GIkiQlzzbaRu9NUHGfk72tPVG2a69LF2BoYB1QNf"; // You'll need to get this from The Blue Alliance

// API Endpoints
const TBA_BASE_URL = "https://www.thebluealliance.com/api/v3";

// Fetch current event data - modified for testing
async function getCurrentEventData() {
  try {
    const response = await fetch(`${TBA_BASE_URL}/event/2025milac`, {
      headers: {
        "X-TBA-Auth-Key": TBA_AUTH_KEY,
      },
    });
    const event = await response.json();
    return event;
  } catch (error) {
    console.error("Error fetching event data:", error);
    return null;
  }
}

// New function to calculate the next event automatically
async function getNextEvent() {
  try {
    const response = await fetch(
      `${TBA_BASE_URL}/team/${FRC_TEAM_KEY}/events/simple`,
      {
        headers: { "X-TBA-Auth-Key": TBA_AUTH_KEY },
      }
    );
    const events = await response.json();
    const now = new Date();
    // Filter for upcoming or currently ongoing events
    const upcoming = events.filter((event) => {
      const start = new Date(event.start_date);
      const end = new Date(event.end_date);
      return start >= now || (start < now && end > now);
    });
    upcoming.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    return upcoming[0];
  } catch (error) {
    console.error("Error fetching next event:", error);
    return null;
  }
}

// Update UI elements with loading state
function setLoadingState(isLoading) {
  const loadingElements = {
    ranking: {
      number: document.getElementById("ranking-number"),
      total: document.getElementById("total-teams"),
    },
    record: {
      wins: document.getElementById("wins"),
      losses: document.getElementById("losses"),
    },
    nextMatch: {
      number: document.getElementById("match-number"),
      time: document.getElementById("match-time"),
      blue: document.getElementById("blue-alliance"),
      red: document.getElementById("red-alliance"),
    },
  };

  if (isLoading) {
    loadingElements.ranking.number.textContent = "...";
    loadingElements.ranking.total.textContent = "Fetching data...";
    loadingElements.record.wins.textContent = "...";
    loadingElements.record.losses.textContent = "...";
    loadingElements.nextMatch.number.textContent = "Loading...";
    loadingElements.nextMatch.time.textContent = "Fetching schedule...";
    loadingElements.nextMatch.blue.textContent = "Loading alliance...";
    loadingElements.nextMatch.red.textContent = "Loading alliance...";
  }
}

// Handle errors gracefully
function setErrorState(element, message = "No data available") {
  const el = document.getElementById(element);
  if (el) {
    el.textContent = message;
  }
}

// Update rankings display with better error handling
async function updateRankings(eventKey) {
  try {
    const response = await fetch(`${TBA_BASE_URL}/event/${eventKey}/rankings`, {
      headers: {
        "X-TBA-Auth-Key": TBA_AUTH_KEY,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch rankings");

    const rankings = await response.json();
    const teamRanking = rankings.rankings.find(
      (r) => r.team_key === FRC_TEAM_KEY
    );

    if (teamRanking) {
      const rankingEl = document.getElementById("ranking-number");
      rankingEl.textContent = teamRanking.rank;
      rankingEl.setAttribute("data-target", teamRanking.rank);
      // Re-trigger counter animation
      runCounter(rankingEl);
      document.getElementById(
        "total-teams"
      ).textContent = `of ${rankings.rankings.length} teams`;
    } else {
      setErrorState("ranking-number", "--");
      setErrorState("total-teams", "Not currently ranked");
    }
  } catch (error) {
    console.error("Error fetching rankings:", error);
    setErrorState("ranking-number", "--");
    setErrorState("total-teams", "Rankings unavailable");
  }
}

// Update match record
async function updateRecord(eventKey) {
  try {
    const response = await fetch(
      `${TBA_BASE_URL}/team/${FRC_TEAM_KEY}/event/${eventKey}/matches`,
      {
        headers: {
          "X-TBA-Auth-Key": TBA_AUTH_KEY,
        },
      }
    );
    const matches = await response.json();

    let wins = 0;
    let losses = 0;

    matches.forEach((match) => {
      if (match.winning_alliance) {
        const isBlue = match.alliances.blue.team_keys.includes(FRC_TEAM_KEY);
        const isWinner =
          (isBlue && match.winning_alliance === "blue") ||
          (!isBlue && match.winning_alliance === "red");
        if (isWinner) wins++;
        else losses++;
      }
    });

    const winsEl = document.getElementById("wins");
    const lossesEl = document.getElementById("losses");
    winsEl.setAttribute("data-target", wins);
    lossesEl.setAttribute("data-target", losses);
    // Re-trigger counter animation
    runCounter(winsEl);
    runCounter(lossesEl);
  } catch (error) {
    console.error("Error fetching match record:", error);
  }
}

// Update next match with better error handling
async function updateNextMatch(eventKey) {
  try {
    const response = await fetch(
      `${TBA_BASE_URL}/team/${FRC_TEAM_KEY}/event/${eventKey}/matches`,
      {
        headers: {
          "X-TBA-Auth-Key": TBA_AUTH_KEY,
        },
      }
    );

    if (!response.ok) throw new Error("Failed to fetch matches");

    const matches = await response.json();
    const nextMatch = matches.find(
      (match) => !match.actual_time && match.predicted_time
    );

    if (nextMatch) {
      document.getElementById(
        "match-number"
      ).textContent = `Match ${nextMatch.match_number}`;

      const matchTime = new Date(nextMatch.predicted_time * 1000);
      document.getElementById("match-time").textContent =
        matchTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

      const blueAlliance = nextMatch.alliances.blue.team_keys
        .map((team) => team.replace("frc", ""))
        .join(", ");
      const redAlliance = nextMatch.alliances.red.team_keys
        .map((team) => team.replace("frc", ""))
        .join(", ");

      document.getElementById("blue-alliance").textContent = blueAlliance;
      document.getElementById("red-alliance").textContent = redAlliance;
    } else {
      document.getElementById("match-number").textContent =
        "No upcoming matches";
      document.getElementById("match-time").textContent = "--:--";
      document.getElementById("blue-alliance").textContent = "TBD";
      document.getElementById("red-alliance").textContent = "TBD";
    }
  } catch (error) {
    console.error("Error fetching next match:", error);
    setErrorState("match-number", "Match data unavailable");
    setErrorState("match-time", "--:--");
    setErrorState("blue-alliance", "TBD");
    setErrorState("red-alliance", "TBD");
  }
}

// Add countdown functionality
function updateCountdown(startDate) {
  const now = new Date().getTime();
  const eventStart = new Date(startDate).getTime();
  const timeLeft = eventStart - now;

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  // Update UI with countdown
  document.getElementById("ranking-number").textContent = days;
  document.getElementById("total-teams").textContent = "Days until event";

  document.getElementById("wins").textContent = hours;
  document.getElementById("losses").textContent = minutes;

  // Update labels
  document.querySelector('[for="wins"]').textContent = "Hours";
  document.querySelector('[for="losses"]').textContent = "Minutes";

  // Update next match section
  document.getElementById("match-number").textContent = "Event Starting Soon";
  document.getElementById("match-time").textContent = new Date(
    startDate
  ).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  document.getElementById("blue-alliance").textContent = "At";
  document.getElementById("red-alliance").textContent = new Date(
    startDate
  ).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// New function for event countdown
function updateEventCountdown(startDate) {
  const now = new Date().getTime();
  const eventStart = new Date(startDate).getTime();
  let timeLeft = eventStart - now;
  if (timeLeft < 0) timeLeft = 0;

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  document.getElementById(
    "countdown-timer"
  ).textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Initialize and update all data with loading states
async function initializeEventData() {
  setLoadingState(true);
  const OFFSET_MS = 37 * 3600 * 1000; // 37 hour offset

  try {
    // Use calculated next event instead of a hardcoded one
    const currentEvent = await getNextEvent();
    if (currentEvent) {
      const now = new Date();
      const adjustedEventStart = new Date(
        new Date(currentEvent.start_date).getTime() + OFFSET_MS
      );
      const adjustedEventEnd = new Date(
        new Date(currentEvent.end_date).getTime() + OFFSET_MS
      );

      if (now < adjustedEventStart || now > adjustedEventEnd) {
        document.getElementById("live-updates").classList.add("hidden");
        document.getElementById("countdown-section").classList.remove("hidden");

        const targetDate =
          now < adjustedEventStart ? adjustedEventStart : adjustedEventEnd;
        updateEventCountdown(targetDate);
        setInterval(() => {
          updateEventCountdown(targetDate);
        }, 1000);
      } else {
        document.getElementById("live-updates").classList.remove("hidden");
        document.getElementById("countdown-section").classList.add("hidden");

        await Promise.all([
          updateRankings(currentEvent.key),
          updateRecord(currentEvent.key),
          updateNextMatch(currentEvent.key),
        ]);

        setInterval(() => {
          updateRankings(currentEvent.key);
          updateRecord(currentEvent.key);
          updateNextMatch(currentEvent.key);
        }, 300000);
      }
    } else {
      setErrorState("ranking-number", "No upcoming event");
      setErrorState("total-teams", "Check back later");
    }
  } catch (error) {
    console.error("Error initializing data:", error);
    setErrorState("ranking-number", "Error loading data");
  }
}

// Start updates when document is loaded
document.addEventListener("DOMContentLoaded", initializeEventData);

// Functions for Lake City Regional page
async function loadEventRankings() {
  try {
    const response = await fetch(`${TBA_BASE_URL}/event/2024mitvc/rankings`, {
      headers: { "X-TBA-Auth-Key": TBA_AUTH_KEY }
    });
    const data = await response.json();
    updateRankingsTable(data.rankings);
  } catch (error) {
    console.error("Error loading rankings:", error);
    document.querySelector("#rankings-table tbody").innerHTML = 
      '<tr><td colspan="4" class="p-4 text-center text-red-400">Error loading rankings</td></tr>';
  }
}

async function loadEventSchedule() {
  try {
    const response = await fetch(`${TBA_BASE_URL}/event/2024mitvc/matches`, {
      headers: { "X-TBA-Auth-Key": TBA_AUTH_KEY }
    });
    const matches = await response.json();
    updateScheduleTable(matches);
  } catch (error) {
    console.error("Error loading schedule:", error);
    document.querySelector("#schedule-table tbody").innerHTML = 
      '<tr><td colspan="5" class="p-4 text-center text-red-400">Error loading schedule</td></tr>';
  }
}

function highlightTeam(text, teamNumber = '7790') {
  return text.replace(
    teamNumber,
    `<span class="text-baywatch-orange font-bold">${teamNumber}</span>`
  );
}

// Helper function to determine winner and apply styling
function getMatchWinnerStyles(match) {
  if (!match.actual_time) return { blueStyle: '', redStyle: '', scoreStyle: '' };
  
  const blueScore = match.alliances.blue.score;
  const redScore = match.alliances.red.score;
  
  if (blueScore > redScore) {
    return {
      blueStyle: 'font-bold',
      redStyle: '',
      scoreStyle: 'font-bold text-blue-400'
    };
  } else if (redScore > blueScore) {
    return {
      blueStyle: '',
      redStyle: 'font-bold',
      scoreStyle: 'font-bold text-red-400'
    };
  }
  return {
    blueStyle: 'font-bold',
    redStyle: 'font-bold',
    scoreStyle: 'font-bold'  // Tie case
  };
}

function updateRankingsTable(rankings) {
  const tbody = document.querySelector("#rankings-table tbody");
  tbody.innerHTML = rankings.map(team => {
    const teamNumber = team.team_key.replace('frc', '');
    const isHighlighted = teamNumber === '7790';
    const rowClass = isHighlighted ? 'bg-baywatch-orange bg-opacity-20' : '';
    
    return `
      <tr class="border-t border-gray-700 ${rowClass}">
        <td class="p-4">${team.rank}</td>
        <td class="p-4">${teamNumber}</td>
        <td class="p-4">${team.record.wins}-${team.record.losses}-${team.record.ties}</td>
        <td class="p-4">${team.sort_orders[0].toFixed(2)}</td>
      </tr>
    `;
  }).join('');
}

function updateScheduleTable(matches) {
  const tbody = document.querySelector("#schedule-table tbody");
  
  const qualMatches = matches
    .filter(match => match.comp_level === 'qm')
    .sort((a, b) => a.match_number - b.match_number);
  
  tbody.innerHTML = qualMatches.map(match => {
    const time = new Date(match.predicted_time * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    const { blueStyle, redStyle, scoreStyle } = getMatchWinnerStyles(match);
    const blueAlliance = highlightTeam(match.alliances.blue.team_keys.map(t => t.replace('frc', '')).join(', '));
    const redAlliance = highlightTeam(match.alliances.red.team_keys.map(t => t.replace('frc', '')).join(', '));
    const score = match.actual_time ? 
      `${match.alliances.blue.score} - ${match.alliances.red.score}` : 
      'Not Played';
    
    return `
      <tr class="border-t border-gray-700">
        <td class="p-4">${time}</td>
        <td class="p-4">${match.match_number}</td>
        <td class="p-4 text-blue-400 ${blueStyle}">${blueAlliance}</td>
        <td class="p-4 text-red-400 ${redStyle}">${redAlliance}</td>
        <td class="p-4 ${scoreStyle}">${score}</td>
      </tr>
    `;
  }).join('');
}

// Function to update playoff bracket
async function updatePlayoffBracket(eventKey) {
  try {
    const response = await fetch(`${TBA_BASE_URL}/event/${eventKey}/matches`, {
      headers: { "X-TBA-Auth-Key": TBA_AUTH_KEY }
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const matches = await response.json();
    
    const playoffMatches = matches.filter(match =>
      match.comp_level === 'sf' || match.comp_level === 'f'
    );

    if (!playoffMatches || playoffMatches.length === 0) {
      const bracketContainer = document.querySelector('.bracket-container');
      if (bracketContainer) {
        bracketContainer.innerHTML = '<p class="text-center text-gray-400 p-8">Playoff matches have not started yet.</p>';
      }
      return;
    }

    // Process semifinal matches:
    const sfMatches = playoffMatches
      .filter(match => match.comp_level === 'sf')
      .sort((a, b) => (a.set_number - b.set_number) || (a.match_number - b.match_number));

    sfMatches.forEach((match, index) => {
      const sequentialNumber = index + 1; // sf match number in order
      const matchId = `match-sf${sequentialNumber}`;
      const matchBox = document.getElementById(matchId);
      if (matchBox) {
        updateMatchBox(matchBox, match);
      }
    });

    // Process finals matches as before
    const finalMatches = playoffMatches.filter(match => match.comp_level === 'f');
    finalMatches.forEach(match => {
      const matchId = `match-f${match.match_number}`;
      const matchBox = document.getElementById(matchId);
      if (matchBox) {
        updateMatchBox(matchBox, match);
      }
    });

  } catch (error) {
    console.error('Error updating playoff bracket:', error);
    const bracketContainer = document.querySelector('.bracket-container');
    if (bracketContainer) {
      bracketContainer.innerHTML = '<p class="text-center text-red-400 p-8">Error loading playoff matches</p>';
    }
  }
}

// Helper function to update a match box
function updateMatchBox(matchBox, match) {
  const blueAlliance = matchBox.querySelector('.alliance.blue');
  const redAlliance = matchBox.querySelector('.alliance.red');

  // Update teams
  blueAlliance.querySelector('.teams').textContent = match.alliances.blue.team_keys
    .map(team => team.replace('frc', ''))
    .join(', ');
  redAlliance.querySelector('.teams').textContent = match.alliances.red.team_keys
    .map(team => team.replace('frc', ''))
    .join(', ');

  // Update scores if available
  if (match.alliances.blue.score >= 0) {
    blueAlliance.querySelector('.score').textContent = match.alliances.blue.score;
    redAlliance.querySelector('.score').textContent = match.alliances.red.score;
  } else {
    blueAlliance.querySelector('.score').textContent = '';
    redAlliance.querySelector('.score').textContent = '';
  }

  // Reset and update winner styling
  blueAlliance.classList.remove('winner');
  redAlliance.classList.remove('winner');
  
  if (match.winning_alliance === 'blue') {
    blueAlliance.classList.add('winner');
  } else if (match.winning_alliance === 'red') {
    redAlliance.classList.add('winner');
  }
}

// Initialize page data
if (window.location.pathname.includes('milac.html')) {
  loadEventRankings();
  loadEventSchedule();
  updatePlayoffBracket('2024mitvc'); // Add this line
  
  // Optional: Add periodic updates
  setInterval(() => {
    updatePlayoffBracket('2024mitvc');
  }, 30000); // Update every 30 seconds
}
