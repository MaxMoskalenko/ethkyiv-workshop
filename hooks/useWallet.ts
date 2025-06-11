import { useState, useCallback, useEffect } from 'react';
import { createWalletClient, custom, getAddress, WalletClient } from 'viem';
import { polygon } from 'viem/chains';

export const useWallet = () => {
    const [walletClient, setWalletClient] = useState<WalletClient | null>(null);

    const getWalletClient = useCallback(async (): Promise<WalletClient> => {
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts',
        });

        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found! Please connect your wallet.');
        }

        return createWalletClient({
            transport: custom(window.ethereum),
            chain: polygon,
            account: getAddress(accounts[0]),
        });
    }, []);

    const connectWallet = useCallback(async () => {
        if (!window.ethereum) {
            throw new Error('No wallet found! Please install MetaMask.');
        }

        try {
            const client = await getWalletClient();
            setWalletClient(client);

            return;
        } catch (error) {
            console.error('Error connecting to wallet:', error);
            throw error;
        }
    }, [getWalletClient]);

    const disconnectWallet = useCallback(() => {
        setWalletClient(null);
    }, []);

    useEffect(() => {
        const checkWalletConnection = async () => {
            if (!window.ethereum || !window.ethereum.selectedAddress) return;

            connectWallet();
        };

        checkWalletConnection();
    }, []);

    return {
        walletClient,
        isConnected: !!walletClient,
        connectWallet,
        disconnectWallet,
    };
};
