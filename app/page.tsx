'use client';

import { TheGame } from '@/components/TheGame';
import { useClearNode } from '@/hooks/useClearNode';
import { useWallet } from '@/hooks/useWallet';
import { useEffect, useMemo, useState } from 'react';
import { Address } from 'viem';

export default function Home() {
    const { connectWallet, isConnected, walletClient } = useWallet();
    const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');

    const { connect, fetchBalances, isAuthenticated, createApplicationSession, closeApplicationSession } =
        useClearNode();

    useEffect(() => {
        if (!walletClient) return;

        connect(walletClient);
    }, [!!walletClient]);

    useEffect(() => {
        if (isAuthenticated && walletClient) {
            fetchBalances(walletClient.account!.address);
        }
    }, [isAuthenticated, !!walletClient]);

    const renderCreateSessionSection = useMemo(() => {
        const isEnabled = isAuthenticated && gameStatus === 'idle' && !!walletClient;
        const account = walletClient?.account?.address as Address;

        return (
            <div className="flex flex-row justify-between w-full">
                <span>Create session</span>
                {isEnabled && (
                    <button onClick={() => createApplicationSession(account)} className="cursor-pointer">
                        Click
                    </button>
                )}
            </div>
        );
    }, [createApplicationSession, gameStatus, isAuthenticated, walletClient]);

    const renderCloseSessionSection = useMemo(() => {
        const appID = localStorage.getItem('app_session_id');

        const isCloseEnabled =
            isAuthenticated && (gameStatus === 'won' || gameStatus === 'lost') && !!walletClient && appID;

        const account = walletClient?.account?.address as Address;

        return (
            <div className="flex flex-row justify-between w-full">
                <span>Close session</span>
                {isCloseEnabled && (
                    <button
                        onClick={() => closeApplicationSession(account, gameStatus === 'lost' ? 0 : 1)}
                        className="cursor-pointer"
                    >
                        Click
                    </button>
                )}
            </div>
        );
    }, [closeApplicationSession, gameStatus, isAuthenticated, walletClient]);

    const renderControlPanel = useMemo(() => {
        const account = walletClient?.account?.address;
        if (!account) return null;

        return (
            <div className="flex flex-col gap-2 w-full">
                <div className="flex flex-row justify-between w-full">
                    <span>Wallet</span>
                    <span>
                        {account.slice(0, 6)}
                        ...{account.slice(-4)}
                    </span>
                </div>

                {renderCreateSessionSection}
                {renderCloseSessionSection}
            </div>
        );
    }, [walletClient, renderCreateSessionSection, renderCloseSessionSection]);

    const renderContent = useMemo(() => {
        if (isConnected) {
            return (
                <>
                    <TheGame setStatusCallback={setGameStatus} />
                    {renderControlPanel}
                </>
            );
        }

        return (
            <>
                <h1 className="text-3xl">NumberGuesser</h1>
                <button className="border rounded-md text-center px-12 py-2 cursor-pointer">
                    <span className="text-2xl" onClick={() => connectWallet()}>
                        Play
                    </span>
                </button>
            </>
        );
    }, [isConnected, connectWallet, renderControlPanel]);

    return (
        <div className="w-screen h-screen bg-blue-300 flex items-center justify-center">
            <div className="flex flex-col gap-4 items-center w-[400px]">{renderContent}</div>
        </div>
    );
}
