import { use, useCallback, useEffect, useState } from 'react';

export const useGameLogic = () => {
    const [targetNumber, setTargetNumber] = useState<number | null>(null);
    const [attemptsLeft, setAttemptsLeft] = useState(3);
    const [hint, setHint] = useState<'<' | '>' | '=' | null>(null);
    const [lastGuessedNumber, setLastGuessedNumber] = useState<number | null>(null);

    const generateRandomNumber = useCallback(() => {
        const randomNumber = Math.floor(Math.random() * 9) + 1;
        setTargetNumber(randomNumber);
    }, []);

    const refresh = useCallback(() => {
        generateRandomNumber();
        setAttemptsLeft(3);
        setHint(null);
        setLastGuessedNumber(null);
    }, [generateRandomNumber]);

    const guessNumber = useCallback(
        (number: number) => {
            if (targetNumber === null) {
                return;
            }

            setLastGuessedNumber(number);

            if (number === targetNumber) {
                setHint('=');
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
                return newAttempts;
            });
        },
        [targetNumber,]
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
        lastGuessedNumber
    };
};
