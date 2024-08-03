const express = require("express");
const http = require("http");
const cors = require("cors");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000", // Your frontend URL
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});
const users = [];
const interval = [];
// Join user to chat
const userJoin = (id, username, room, score) => {
  const user = { id, username, room, score };
  users.push(user);
  return user;
};

// User leaves chat
const userLeave = (id) => {
  const index = users.findIndex((user) => user.id === id);
  if (index !== -1) {
    const user = users.splice(index, 1)[0];

    // Decrease player count in the game
    const gameIndex = games.findIndex((game) => game.id === user.room);
    if (gameIndex !== -1) {
      games[gameIndex].playerCount--;

      // If the game becomes empty, remove it from the games array
      // if (games[gameIndex].playerCount === 0) {
      //   games.splice(gameIndex, 1);
      // }
    }

    return user;
  }
};

// Get users in a room
const getUsers = (room) => {
  return users.filter((user) => user.room === room);
};
//Set drawer
// let index=0;
const setDrawerfnc = (room, ind) => {
  const usersInRoom = getUsers(room);
  // console.log(usersInRoom)
  const drawerIndex = ind % usersInRoom.length;
  //index++;
  return usersInRoom[drawerIndex];
};
const port = 4000;
const MAX_PLAYERS_PER_GAME = 2;
let games = [{ id: "game-1", playerCount: 0 }];
let currentGameIndex = 0;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/current-game", (req, res) => {
  res.json(games[currentGameIndex]);
});

app.post("/join-game", (req, res) => {
  const { name } = req.body;
  // console.log(`User ${name} wants to join game ${gameId}`);

  const game = games.find(
    (game) => game.playerCount < MAX_PLAYERS_PER_GAME + 1
  );

  if (game) {
    console.log("game", game);
    game.playerCount++;
    res.json({ success: true, gameId: game.id });
  } else {
    const newGameId = `game-${games.length}`;
    games.push({ id: newGameId, playerCount: 1 });
    currentGameIndex++;
    // userJoin(socket.id, name, newGameId, 0);
    // socket.join(newGameId);
    // io.to(newGameId).emit('user-joined', { name });
    res.json({ success: true, gameId: newGameId });
  }
  // if (games[currentGameIndex].id === gameId) {
  //   if (games[currentGameIndex].playerCount < MAX_PLAYERS_PER_GAME) {
  //     games[currentGameIndex].playerCount++;
  //     if (games[currentGameIndex].playerCount === MAX_PLAYERS_PER_GAME) {
  //       currentGameIndex++;
  //       games.push({ id: `game-${currentGameIndex + 1}`, playerCount: 0 });
  //     }
  //     res.json({ success: true });
  //   } else {
  //     res.status(400).json({ error: 'Game is full' });
  //   }
  // } else {
  //   res.status(400).json({ error: 'Invalid game ID' });
  // }
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("user-joined", ({ name, gameId }) => {
    userJoin(socket.id, name, gameId, 0);
    console.log(`User ${name} with ${socket.id} joined game ${gameId}`);
    socket.join(gameId);
    io.to(gameId).emit("user-joined", { name });
  });

  socket.on("players-present", (gameId) => {
    const roomUsers = getUsers(gameId.gameId);
    console.log(
      `Players present in game ${gameId.gameId}: ${roomUsers.map(
        (user) => user.username
      )}`
    );
    io.to(gameId.gameId).emit("players-present", roomUsers);
  });
  socket.on("Drawer", (data) => {
    console.log(data);
    const { gameId } = data;
    console.log("hi from draw server");
    const sz = interval.length;
    let ind = 0;
    console.log(interval);
    if (data && !interval.find((game) => game === gameId))
      interval.push(gameId);
    console.log(interval);
    if (sz === interval.length) return;
    const intervalId = setInterval(() => {
      const drawer = setDrawerfnc(gameId, ind);
      ind++;
      console.log(drawer);
      if (drawer) io.to(gameId).emit("Drawer", drawer);
    }, 10000);
    const stopInterval = () => {
      clearInterval(intervalId);
      const roomUsers = getUsers(gameId);
      console.log("Interval stopped");

      const index = interval.findIndex((game) => game === gameId);
      if (index !== -1) {
        interval.splice(index, 1);
      }
      io.to(gameId).emit("stopInterval", roomUsers);
    };

    // Stop the interval after 5 seconds
    setTimeout(stopInterval, 40000);
  });
  socket.on("ChosenWord", (data) => {
    const { gameId, word } = data;
    io.to(gameId).emit("ChosenWord", word);
  });
  socket.on("chat-message", (m) => {
    const { gameId, message } = m;
    const user = users.find((user) => user.id === socket.id);
    if (user) {
      const chatMessage = { text: message.text, sender: user.username };
      console.log(`Chat message from ${user.username}: ${message.text}`);
      io.to(gameId).emit("chat-message", chatMessage);
    }
  });
  socket.on("score", (data) => {
    const { gameId, score } = data;
    const roomUsers = getUsers(gameId);
    const user = roomUsers.find((user) => user.id === socket.id);
    if (user) {
      user.score += score;
      console.log(`Score of ${user.username}: ${user.score}`);
      io.to(gameId).emit("score", roomUsers);
    }
  });
  socket.on("drawing", (Drawingdata) => {
    const { gameId, data } = Drawingdata;
    io.to(gameId).emit("drawing", data);
  });
  socket.on("rematch", (data) => {
    const { gameId } = data;
    const roomUsers = getUsers(gameId);
    roomUsers.forEach((user) => {
      user.score = 0;
    });
    //io.to(gameId).emit('rematch', roomUsers);
  });
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      const { username, room } = user;
      console.log(`User ${username} with ${socket.id} left game ${room}`);
      let i = games.findIndex((game) => game.id === room);
      //console.log("hello sirji",games[i].playerCount)
      //console.log(`User ${user.username} disconnected`);
    }
  });
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
