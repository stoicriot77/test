import React, { useRef, useState, useEffect } from "react";
import "./App.css";
import * as posenet from "@tensorflow-models/posenet";
import { drawKeypoints, drawSkeleton } from "./utilities";
import videoSrc from './DSCF9664_1.mp4';

function App() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const imageRef = useRef(null);
    const [squares, setSquares] = useState([]);

    useEffect(() => {
        runPosenet();
    }, []);

    const runPosenet = async () => {
        const net = await posenet.load({
            inputResolution: { width: 640, height: 480 },
            scale: 0.8,
        });

        setInterval(() => {
            detect(net);
        }, 100);
    };

    const detect = async (net) => {
        if (
            typeof videoRef.current !== "undefined" &&
            videoRef.current !== null &&
            videoRef.current.readyState === 4
        ) {
            const video = videoRef.current;
            const videoWidth = videoRef.current.videoWidth;
            const videoHeight = videoRef.current.videoHeight;

            video.width = videoWidth;
            video.height = videoHeight;

            const pose = await net.estimateSinglePose(video);
            drawCanvas(pose, video, videoWidth, videoHeight, canvasRef);
        }
    };

    const calculateScore = (angle, target) => {
        const deviation = Math.abs(target - angle);
        const score = 100 - deviation;
        return Math.max(0, score);
    };

    const targetAngles = {
        "Left Shoulder": 120,
        "Right Shoulder": 120,
        "Left Elbow": 60,
        "Right Elbow": 60,
        "Left Hip": 110,
        "Right Hip": 110,
        "Left Knee": 90,
        "Right Knee": 90
    };

    const drawCanvas = (pose, video, videoWidth, videoHeight, canvas) => {
        const ctx = canvas.current.getContext("2d");
        canvas.current.width = videoWidth;
        canvas.current.height = videoHeight;

        drawKeypoints(pose["keypoints"], 0.9, ctx);
        drawSkeleton(pose["keypoints"], 0.9, ctx);

        const angles = [
            { title: "Left Shoulder", value: drawAngleArc(pose.keypoints[8], pose.keypoints[6], pose.keypoints[12], 'yellow', ctx) },
            { title: "Left Elbow", value: drawAngleArc(pose.keypoints[10], pose.keypoints[8], pose.keypoints[6], 'green', ctx) },
            { title: "Left Hip", value: drawAngleArc(pose.keypoints[6], pose.keypoints[12], pose.keypoints[14], 'blue', ctx) },
            { title: "Left Knee", value: drawAngleArc(pose.keypoints[12], pose.keypoints[14], pose.keypoints[16], 'red', ctx) },
            { title: "Right Shoulder", value: drawAngleArc(pose.keypoints[7], pose.keypoints[5], pose.keypoints[11], 'yellow', ctx) },
            { title: "Right Elbow", value: drawAngleArc(pose.keypoints[9], pose.keypoints[7], pose.keypoints[5], 'green', ctx) },
            { title: "Right Hip", value: drawAngleArc(pose.keypoints[5], pose.keypoints[11], pose.keypoints[13], 'blue', ctx) },
            { title: "Right Knee", value: drawAngleArc(pose.keypoints[11], pose.keypoints[13], pose.keypoints[15], 'red', ctx) }
        ];

        const scores = angles.map(angleData => calculateScore(angleData.value, targetAngles[angleData.title]));
        const totalScore = scores.reduce((acc, curr) => acc + curr, 0) / scores.length;

        const maxScore = Math.max(...scores);
        const maxScoreIndex = scores.indexOf(maxScore);
        const mainTurningPoint = angles[maxScoreIndex].title;

        const colors = ["yellow", "green", "blue", "red"];
        const mainTurningPointColor = colors[maxScoreIndex % 4];

        ctx.fillStyle = mainTurningPointColor;
        ctx.font = "48px Arial";
        ctx.fillText(`Main Turning Point: ${mainTurningPoint}`, 100, 465);

        drawScoreBar(ctx, 100, 800, 300, 30, scores);

        ctx.fillStyle = "white";
        ctx.font = "32px Arial";
        let yPositionLeft = 300;
        let yPositionRight = 300;
        for (let i = 0; i < angles.length; i++) {
            if (i < 4) {
                ctx.fillText(angles[i].title, 100, yPositionLeft);
                ctx.fillText(angles[i].value.toFixed(2) + "°", 335, yPositionLeft);
                yPositionLeft += 32;
            } else {
                ctx.fillText(angles[i].title, 415 + 85, yPositionRight);
                ctx.fillText(angles[i].value.toFixed(2) + "°", 650 + 85, yPositionRight);
                yPositionRight += 32;
            }
        }

        ctx.strokeStyle = "white";
        ctx.lineWidth = 4;
        ctx.strokeRect(100, 500, 30, 300);

        ctx.fillStyle = "white";
        ctx.font = "32 px Arial";
        ctx.fillText(totalScore.toFixed(2) + " %", 100, 850);

        if (imageRef.current) {
            const rotationDegree = 3.6 * totalScore;
            imageRef.current.style.transform = `rotate(${rotationDegree}deg)`;
        }

        // Animation: add squares when main turning point changes
        addSquare(mainTurningPointColor);
    };

    const drawScoreBar = (ctx, x, y, height, width, scores) => {
        const sectionHeight = height / 4;
        let currentY = y;
        for (let i = 0; i < 4; i++) {
            const color = ["red", "blue", "green", "yellow"][i];
            const fillHeight = (scores[i] / 100) * sectionHeight;
            ctx.fillStyle = color;
            ctx.fillRect(x, currentY, width, -fillHeight);
            currentY -= sectionHeight;
        }
    };

    const addSquare = (color) => {
        if (squares.length < 100) {
            setSquares(prevSquares => [...prevSquares, color]);
        }
    }

    useEffect(() => {
        if (squares.length === 100) {
            const ctx = canvasRef.current.getContext("2d");
            ctx.fillStyle = squares[99];
            ctx.font = "60px Arial";
            ctx.fillText("Game Over", 1080 / 2, 1920 / 2);
        }
    }, [squares]);

    useEffect(() => {
        const ctx = canvasRef.current.getContext("2d");
        let xPos = 1080;
        let yPos = 1920;

        squares.forEach((color, index) => {
            ctx.fillStyle = color;
            ctx.fillRect(xPos, yPos, -108, -108);

            xPos -= 108;

            if (index !== 0 && index % 10 === 0) {
                yPos -= 108;
                xPos = 1080;
            }
        });
    }, [squares]);

    return (
        <div className="App">
            <header className="App-header">
                <video
                    ref={videoRef}
                    src={videoSrc}
                    style={{
                        position: "absolute",
                        marginLeft: "auto",
                        marginRight: "auto",
                        left: 0,
                        right: 0,
                        textAlign: "center",
                        zindex: 9,
                        width: 1080,
                        height: 1920,
                    }}
                    autoPlay
                    muted
                    loop
                    playsInline
                />
                <img
                    ref={imageRef}
                    src="path_to_your_image_here.png"
                    alt="Turning"
                    style={{
                        position: "absolute",
                        left: "870px",
                        top: "950px",
                        zindex: 10,
                        width: "125px",
                        height: "125px"
                    }}
                />
                <canvas
                    ref={canvasRef}
                    style={{
                        position: "absolute",
                        marginLeft: "auto",
                        marginRight: "auto",
                        left: 0,
                        right: 0,
                        textAlign: "center",
                        zindex: 9,
                        width: 1080,
                        height: 1920,
                    }}
                />
            </header>
        </div>
    );
}

function drawAngleArc(A, B, C, color, ctx) {
    const BA = { x: A.position.x - B.position.x, y: A.position.y - B.position.y };
    const BC = { x: C.position.x - B.position.x, y: C.position.y - B.position.y };
    const dotProduct = BA.x * BC.x + BA.y * BC.y;
    const crossProduct = BA.x * BC.y - BA.y * BC.x;
    const alpha = Math.atan2(crossProduct, dotProduct);
    const startAngle = Math.atan2(BA.y, BA.x);
    const endAngle = startAngle + alpha;
    const angleDeg = Math.abs(alpha * (180 / Math.PI));
    ctx.beginPath();
    ctx.arc(B.position.x, B.position.y, 20, startAngle, endAngle, alpha < 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.stroke();
    return angleDeg;
}

export default App;

