'use client';

import { TheGame } from '@/components/TheGame';
import { useMemo, useState } from 'react';

export default function Home() {
    const [isGameStarted, setIsGameStarted] = useState(false);

    const renderContent = useMemo(() => {
        if (isGameStarted) {
            return <TheGame />;
        }

        return (
            <>
                <h1 className="text-3xl">NumberGuesser</h1>
                <button className="border rounded-md text-center px-12 py-2 cursor-pointer">
                    <span
                        className="text-2xl"
                        onClick={() => {
                            setIsGameStarted(true);
                        }}
                    >
                        Play
                    </span>
                </button>
            </>
        );
    }, [isGameStarted]);

    return (
        <div className="w-screen h-screen bg-blue-300 flex items-center justify-center">
            <div className="flex flex-col gap-4 items-center">
                {renderContent}
            </div>
        </div>
    );
}
