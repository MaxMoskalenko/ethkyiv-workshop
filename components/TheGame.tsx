import { useGameLogic } from '@/hooks/useGameLogic';
import { useCallback, useState } from 'react';

export const TheGame = () => {
    const {
        targetNumber,
        attemptsLeft,
        guessNumber,
        hint,
        refresh,
        lastGuessedNumber,
    } = useGameLogic();

    const renderNumberButton = useCallback(
        (number: number) => {
            return (
                <button
                    key={number}
                    className="border rounded-md text-center px-12 py-2 cursor-pointer"
                    onClick={() => guessNumber(number)}
                >
                    <span className="text-2xl">{number}</span>
                </button>
            );
        },
        [guessNumber]
    );

    const renderHint = useCallback(() => {
        if (hint === null) {
            return <span>Press the button ^</span>;
        }

        if (hint === '=') {
            return (
                <span className="text-green-700">
                    You guessed the number {targetNumber}
                </span>
            );
        }

        return (
            <span>
                {attemptsLeft > 0
                    ? `The target number is ${hint} than ${lastGuessedNumber}. Attempts left: ${attemptsLeft}.`
                    : `Game over! The target number was ${targetNumber}.`}
            </span>
        );
    }, [targetNumber, attemptsLeft, hint, lastGuessedNumber]);

    return (
        <>
            <h1 className="text-3xl">Guess the number</h1>
            <div className="grid grid-cols-3 grid-rows-3 gap-4">
                {Array.from({ length: 9 }, (_, index) => {
                    const number = index + 1;
                    return renderNumberButton(number);
                })}
            </div>
            <div className="text-xl">{renderHint()}</div>
            
            <div className="mt-5"></div>

            <button
                className="border rounded-md text-center px-12 py-2 cursor-pointer"
                onClick={refresh}
            >
                <span className="text-xl">Refresh</span>
            </button>
        </>
    );
};
