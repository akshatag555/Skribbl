'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { socket } from '@/app/page';
import AccessAlarmsIcon from '@mui/icons-material/AccessAlarms';
import { IoBrush } from 'react-icons/io5';
import DrawIcon from '@mui/icons-material/Draw';
import { LuEraser } from 'react-icons/lu';
import items from '@/app/words';
export default function Home() {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [context, setContext] = useState(null);
    const [strokeSize, setStrokeSize] = useState(5);
    const [strokeColor, setStrokeColor] = useState('#000000');
    const [isErasing, setIsErasing] = useState(false);
    const [chosenWord, setChosenWord] = useState('');
    const [players, setPlayers] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [sender, setSender] = useState('Your Name'); // Replace "Your Name" with the actual sender's name
    const [chatInput, setChatInput] = useState('');
    const [gameId, setGameId] = useState(null);
    const [drawer, setDrawer] = useState('');
    const [drawerId, setDrawerId] = useState(null);
    const [seconds, setSeconds] = useState(10);
    const intervalRef = useRef(null);
    const [rematch, setRematch] = useState(false);
    const [finish, setFinish] = useState(false);
    const params = useParams();
    const router = useRouter();
    // useEffect(() => {
    //   if (!params.id) {
    //     router.push("/");
    //   }
    // }, [params.id]);
    useEffect(() => {
        const fetchGameId = () => {
            try {
                console.log(params);
                console.log(params.id);
                setGameId(params.id);
                console.log('hi from fetchGameId', gameId);
            } catch (error) {
                console.error('Error fetching game ID:', error);
            }
        };

        fetchGameId();
    }, [params.id]);

    useEffect(() => {
        if (gameId) {
            console.log('Game ID:', gameId);
            console.log('hi from useEffect');
            socket.emit('players-present', { gameId: gameId });
            const handlePlayersPresent = (data) => {
                console.log('Game data:', data);
                //const playerNames = data.map(player => player.username);
                setPlayers(data);
                console.log('Players:', players);
            };
            socket.on('players-present', handlePlayersPresent);

            return () => {
                socket.off('players-present', handlePlayersPresent);
            };
        }
    }, [gameId]);

    useEffect(() => {
        console.log('rematch?', rematch);
        console.log('Game ID:', gameId);
        console.log('hi from client');
        socket.emit('Drawer', { gameId: gameId });
        const handleDrawer = (drawer) => {
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            console.log('Drawer called');
            console.log('Drawer:', drawer.username);
            setDrawerId(drawer.id);
            setDrawer(drawer.username);
            setSeconds(10);
            let word = items[Math.floor(Math.random() * items.length)];
            socket.emit('ChosenWord', { gameId: params.id, word: word });
        };

        const handleChosenWord = (word) => {
            setChosenWord(word);
        };

        socket.on('stopInterval', handleFinish);
        socket.on('Drawer', handleDrawer);
        socket.on('ChosenWord', handleChosenWord);

        // intervalRef.current = setInterval(() => {

        // }, 10000);

        return () => {
            socket.off('stopInterval', handleFinish);
            socket.off('Drawer', handleDrawer);
            socket.off('ChosenWord', handleChosenWord);
        };
    }, [gameId, rematch]);

    useEffect(() => {
        // Set up an interval to run every second
        const intervalId = setInterval(() => {
            setSeconds((prevSeconds) => Math.max(prevSeconds - 1, 0));
        }, 1000);

        // Clear the interval when the component unmounts
        return () => clearInterval(intervalId);
    }, []);

    // Stop the timer at zero

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        setContext(ctx);

        socket.on('drawing', (d) => {
            const img = new Image();
            img.src = d;
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
            };
        });

        socket.on('chat-message', (message) => {
            console.log('Chat message:', message);
            setChatMessages((prevMessages) => [...prevMessages, message]);
            setSender(message.sender);
        });
        socket.on('score', (score) => {
            console.log('Score:', score);
            setPlayers(score);
            console.log('Score:', players);
        });
        return () => {
            socket.off('score');
            socket.off('drawing');
            socket.off('chat-message');
        };
    }, []);

    useEffect(() => {
        if (context) {
            context.lineWidth = strokeSize;
            context.strokeStyle = isErasing ? '#FFFFFF' : strokeColor;
        }
    }, [context, strokeSize, strokeColor, isErasing]);

    const saveState = () => {
        if (context) {
            const canvas = canvasRef.current;
            const dataUrl = canvas.toDataURL();
            socket.emit('drawing', { gameId: gameId, data: dataUrl });
        }
    };

    const startDrawing = (e) => {
        console.log(socket.id, drawerId);
        if (!context || socket.id !== drawerId) return;
        setIsDrawing(true);
        context.beginPath();
        context.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        saveState();
    };

    const draw = (e) => {
        if (!isDrawing || socket.id !== drawerId) return;
        context.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        context.stroke();
        saveState();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        context.closePath();
    };

    const toggleEraser = () => {
        setIsErasing((prev) => !prev);
    };

    const handleChatSubmit = (e) => {
        e.preventDefault();
        if (chatInput.trim()) {
            const message = { text: chatInput.trim(), sender: 'Your Name' }; // Replace "Your Name" with the actual sender's name
            let score = 0;
            if (message.text === chosenWord) {
                score = seconds * 5;
                socket.emit('score', { gameId: gameId, score });
            }
            socket.emit('chat-message', { gameId: gameId, message });
            setChatInput('');
        }
    };
    const handleFinish = (data) => {
        setPlayers(data);

        setDrawerId('null');
        setDrawer('');
        setChosenWord('');
        console.log('hi from finish', players);
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
        console.log('sortedPlayers', sortedPlayers);
        // setPlayers(sortedPlayers);
        setFinish(true);

        setTimeout(() => {
            socket.emit('rematch', { gameId: gameId });
            setRematch(!rematch);
            setFinish(false);
        }, 5000);
    };
    const handlePlayAgain = () => {
        setFinish(false);
        socket.emit('Drawer', { gameId: gameId });
    };
    return (
        <div className="bg-gray-900 flex min-h-screen">
            {finish && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
                    <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                        <h2 className="text-3xl font-bold mb-4 text-center text-purple-600">
                            Game Over!
                        </h2>
                        <h3 className="text-2xl font-semibold mb-4 text-center text-purple-500">
                            Podium
                        </h3>
                        <ol className="list-decimal pl-5 text-lg">
                            {players.map((player, index) => (
                                <li key={index} className="mb-2">
                                    <span className="text-purple-700">
                                        {player.username}
                                    </span>{' '}
                                    -{' '}
                                    <span className="text-green-500">
                                        {player.score} points
                                    </span>
                                </li>
                            ))}
                        </ol>
                        <h3 className="text-xl font-semibold mt-6 text-purple-500">
                            Other Players
                        </h3>
                        <ul className="list-disc pl-5 text-lg">
                            {players.map((player, index) => (
                                <li key={index} className="mb-2">
                                    <span className="text-gray-700">
                                        {player.username}
                                    </span>{' '}
                                    -{' '}
                                    <span className="text-green-500">
                                        {player.score} points
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {/* <button
                onClick={handlePlayAgain}
                className="mt-6 w-full px-6 py-2 bg-purple-500 text-white rounded-lg shadow-md hover:bg-purple-600 transition-colors"
              >
                Play Again
              </button> */}
                    </div>
                </div>
            )}
            <div className="w-1/5 bg-gray-800 p-4 border-r border-gray-700">
                <h2 className="text-2xl font-semibold mb-4 text-center text-white">
                    Players
                </h2>
                <ul>
                    {players.map((player, index) => (
                        <li
                            key={index}
                            className={`mb-2 text-lg text-white ${
                                socket.id === player.id ? 'text-blue-400' : ''
                            }`}
                        >
                            {player.username} - {player.score}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-900">
                <h1 className="text-4xl font-bold text-yellow-500 mb-4">
                    <AccessAlarmsIcon sx={{ fontSize: 45 }} /> {seconds} seconds
                </h1>
                <div className="flex justify-center mb-6">
                    {chosenWord.split('').map((char, index) => (
                        <div
                            key={index}
                            className="w-12 h-12 border-b-4 border-yellow-500 mx-1 text-center text-2xl font-semibold text-white"
                        >
                            {drawerId === socket.id ? char : '_'}
                        </div>
                    ))}
                </div>
                <canvas
                    id="canvas"
                    ref={canvasRef}
                    width={500}
                    height={500}
                    className="border border-gray-700 rounded-lg shadow-lg bg-white"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                ></canvas>
                <div className="flex items-center mt-6 space-x-6">
                    <div className="flex items-center space-x-4">
                        <label
                            htmlFor="strokeSize"
                            className="font-semibold text-white"
                        >
                            Stroke Size:
                        </label>
                        <input
                            id="strokeSize"
                            type="range"
                            min="1"
                            max="50"
                            value={strokeSize}
                            onChange={(e) => setStrokeSize(e.target.value)}
                            className="slider"
                        />
                        {/* <span className="text-white">{strokeSize}px</span> */}
                    </div>
                    <div className="flex items-center space-x-4">
                        <label
                            htmlFor="strokeColor"
                            className="font-semibold text-white"
                        >
                            Stroke Color:
                        </label>
                        <input
                            id="strokeColor"
                            type="color"
                            value={strokeColor}
                            onChange={(e) => setStrokeColor(e.target.value)}
                            className="color-picker w-12 h-12 p-1 border border-gray-500 rounded-lg"
                        />
                        {/* <span className="text-white">{strokeColor}</span> */}
                    </div>
                    <button
                        onClick={toggleEraser}
                    >
                        {isErasing ? <IoBrush /> : <LuEraser />}
                    </button>
                </div>
            </div>
            <div className="w-1/5 bg-gray-800 p-4 border-l border-gray-700">
                <h2 className="text-2xl font-semibold mb-4 text-center text-white">
                    Chat
                </h2>
                <div className="h-64 overflow-y-auto mb-4 bg-gray-700 p-2 rounded-lg">
                    {chatMessages.map((msg, index) => (
                        <div
                            key={index}
                            className={`mb-2 text-lg text-white ${
                                msg.text === chosenWord ? 'text-green-500' : ''
                            }`}
                        >
                            <strong>{msg.sender}:</strong>{' '}
                            {msg.text === chosenWord
                                ? 'guessed right'
                                : msg.text}
                        </div>
                    ))}
                </div>
                <form onSubmit={handleChatSubmit} className="flex">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="flex-1 p-2 border border-gray-500 rounded-l-lg focus:outline-none focus:border-blue-500"
                        placeholder="Type a message..."
                        disabled={socket.id === drawerId}
                    />
                    <button
                        type="submit"
                        className={`px-4 py-2 ${
                            socket.id === drawerId
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-600 transition-colors'
                        } text-white rounded-r-lg`}
                        disabled={socket.id === drawerId}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
