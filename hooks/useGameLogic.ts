import { useCallback, useEffect, useState } from 'react';

export const useGameLogic = () => {
    const [targetNumber, setTargetNumber] = useState<number | null>(null);
    const [attemptsLeft, setAttemptsLeft] = useState(3);
    const [hint, setHint] = useState<'<' | '>' | '=' | null>(null);
    const [lastGuessedNumber, setLastGuessedNumber] = useState<number | null>(null);
    const [status, setStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');

    const generateRandomNumber = useCallback(() => {
        const randomNumber = Math.floor(Math.random() * 9) + 1;
        setTargetNumber(randomNumber);
    }, []);

    const refresh = useCallback(() => {
        generateRandomNumber();
        setAttemptsLeft(3);
        setHint(null);
        setLastGuessedNumber(null);
        setStatus('idle');
    }, [generateRandomNumber]);

    const guessNumber = useCallback(
        (number: number) => {
            if (!targetNumber || (status !== 'playing' && status !== 'idle')) {
                console.warn('Game is over or not started yet.');
                return;
            }

            setLastGuessedNumber(number);
            setStatus('playing');

            if (number === targetNumber) {
                setHint('=');
                setStatus('won');
                return;
            }

            if (targetNumber < number) {
                setHint('<');
            }

            if (targetNumber > number) {
                setHint('>');
            }

            setAttemptsLeft((prev) => {
                const newAttempts = prev - 1;
                if (newAttempts <= 0) {
                    setStatus('lost');
                }
                return newAttempts;
            });
        },
        [targetNumber, status]
    );

    useEffect(() => {
        refresh();
    }, []);

    return {
        targetNumber,
        attemptsLeft,
        guessNumber,
        hint,
        refresh,
        lastGuessedNumber,
        status,
    };
};
