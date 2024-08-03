"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import io from "socket.io-client";
import axios from "axios";

const server = "http://localhost:4000";
const connectionOptions = {
  "force new connection": true,
  reconnectionAttempts: "Infinity",
  timeout: 10000,
  transports: ["websocket"],
};

export const socket = io(server, connectionOptions);

const Enter = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [gameId, setGameId] = useState(null);

  socket.on("connect", () => {
    console.log("Connected to server");
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from server");
  });

  // useEffect(() => {
  //   const fetchGameId = async () => {
  //     try {
  //       const response = await axios.get(`${server}/current-game`);
  //       setGameId(response.data.id);
  //     } catch (error) {
  //       console.error("Error fetching game ID:", error);
  //     }
  //   };

  //   fetchGameId();
  // }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name.length < 3) {
      setError("Name must be at least 3 letters long");
      return;
    }
    setError("");

    try {
      const response = await axios.post(`${server}/join-game`, {
        name,
        gameId,
      });
      console.log(response.data);
      if (response.data.success) {
        setGameId(response.data.gameId);
        //const a=response.data.gameId;
        socket.emit("user-joined", { name, gameId: response.data.gameId });
        router.push(`/skribbl/${response.data.gameId}`);
      }
    } catch (error) {
      setError(error.response?.data?.error || "Error joining game");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
      <form
        className="bg-gray-800 shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4"
        onSubmit={handleSubmit}
      >
        <div className="mb-4">
          <label
            className="block text-white text-lg font-bold mb-2"
            htmlFor="username"
          >
            Name
          </label>
          <input
            className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 text-gray-200 leading-tight focus:outline-none focus:border-blue-500"
            id="username"
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <p className="text-red-500 text-xs italic mt-2">{error}</p>}
        </div>
        <div className="flex items-center justify-between">
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
            type="submit"
          >
            Play
          </button>
          <button
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
            type="button"
            onClick={() => router.push("/create-room")}
          >
            Create Private Room
          </button>
        </div>
      </form>
    </div>
  );
};

export default Enter;
