/* eslint-disable max-len */

import {
    Allowance,
    AuthRequest,
    createAuthRequestMessage,
    createAuthVerifyMessage,
    createAuthVerifyMessageWithJWT,
    createEIP712AuthMessageSigner,
    createGetLedgerBalancesMessage,
    createPingMessage,
    parseRPCResponse,
} from '@erc7824/nitrolite';
import { useCallback, useEffect, useState } from 'react';
import { Address, Hex, WalletClient } from 'viem';
import { useSessionKey } from './useStateWallet';
import { useCreateApplicationSession } from './useCreateApplicationSession';
import { useCloseApplicationSession } from './useCloseApplicationSession';

export const useClearNode = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [ws, setWs] = useState<WebSocket | null>(null);

    const { address: sessionKeyAddress, sign: messageSigner } = useSessionKey();

    const { createApplicationSession: createApplicationSessionMessage } = useCreateApplicationSession();

    const { closeApplicationSession: closeApplicationSessionMessage } = useCloseApplicationSession();

    const getOnConnectCallback = useCallback((ws: WebSocket, authRequestParams: AuthRequest) => {
        return async () => {
            // Get the stored JWT token
            const jwtToken = window.localStorage.getItem('clearnode_jwt');

            let authRequestMsg;

            if (jwtToken) {
                authRequestMsg = await createAuthVerifyMessageWithJWT(
                    jwtToken // JWT token for reconnection
                );
            } else {
                authRequestMsg = await createAuthRequestMessage(authRequestParams);
            }

            ws.send(authRequestMsg);
        };
    }, []);

    const getOnMessageCallback = useCallback(
        (ws: WebSocket, walletClient: WalletClient, authRequestParams: AuthRequest) => {
            return async (event: MessageEvent) => {
                try {
                    if (!walletClient) {
                        console.error('Wallet client is not initialized');
                        return;
                    }

                    const message = parseRPCResponse(event.data);

                    switch (message.method) {
                        case 'auth_challenge':
                            console.log('Received auth challenge');
                            const eip712MessageSigner = createEIP712AuthMessageSigner(
                                walletClient,
                                {
                                    scope: authRequestParams.scope!,
                                    application: authRequestParams.application!,
                                    participant: authRequestParams.participant,
                                    expire: authRequestParams.expire!,
                                    allowances: authRequestParams.allowances.map((a: Allowance) => ({
                                        asset: a.symbol,
                                        amount: a.amount,
                                    })),
                                },
                                {
                                    name: 'Your Domain',
                                }
                            );

                            const authVerifyMsg = await createAuthVerifyMessage(eip712MessageSigner, message);

                            ws.send(authVerifyMsg);
                            break;
                        case 'auth_verify':
                            if (!message.params.success) {
                                return;
                            }

                            setIsAuthenticated(true);

                            if (message.params.jwtToken) {
                                window.localStorage.setItem('clearnode_jwt', message.params.jwtToken);
                            }
                            break;
                        case 'error':
                            console.error('Authentication failed:', message.params.error);
                            return;
                        // TODO: add parsing for pong - ignore
                        // Balances -- display it
                        // open session -- save app session ID to local storage
                        // close session -- remove app session ID from local storage
                    }
                } catch (error) {
                    console.error('Error handling message:', error);
                }
            };
        },
        []
    );

    useEffect(() => {
        if (!ws) {
            return;
        }

        const interval = setInterval(async () => {
            if (ws.readyState === WebSocket.OPEN) {
                const msg = await createPingMessage(messageSigner);

                ws.send(msg);
            } else {
                console.warn('WebSocket is not open, attempting to reconnect...');
                ws.close();
                setWs(null);
            }
        }, 10000);

        return () => {
            clearInterval(interval);
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [!!ws]);

    const connect = useCallback(
        async (walletClient: WalletClient) => {
            if (!walletClient) {
                console.error('Wallet client is not initialized');
                return;
            }

            const ws = new WebSocket('wss://clearnet.yellow.com/ws');

            const authRequestParams: AuthRequest = {
                wallet: walletClient.account!.address,
                participant: sessionKeyAddress,
                app_name: 'Your Domain',
                expire: String(Math.floor(Date.now() / 1000) + 3600), // 1 hour expiration
                scope: 'console',
                application: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
                allowances: [],
            };

            ws.onopen = getOnConnectCallback(ws, authRequestParams);

            ws.onmessage = getOnMessageCallback(ws, walletClient, authRequestParams);

            setWs(ws);
        },
        [getOnConnectCallback, getOnMessageCallback, sessionKeyAddress]
    );

    const fetchBalances = useCallback(
        async (account: Address) => {
            if (!ws) {
                console.error('WebSocket is not connected');
                return;
            }

            const msg = await createGetLedgerBalancesMessage(messageSigner, account);
            ws.send(msg);
        },
        [messageSigner, ws]
    );

    const createApplicationSession = useCallback(
        async (account: Address) => {
            if (!ws) {
                console.error('WebSocket is not connected');
                return;
            }

            const sendRequest = (msg: string) => {
                ws.send(msg);
            };

            await createApplicationSessionMessage(
                messageSigner,
                sendRequest,
                account,
                process.env.NEXT_PUBLIC_CP_SESSION_KEY_PUBLIC_KEY as Address,
                '0.001'
            );
        },
        [createApplicationSessionMessage, messageSigner, ws]
    );

    const closeApplicationSession = useCallback(
        async (account: Address, payerIndex: 0 | 1) => {
            if (!ws) {
                console.error('WebSocket is not connected');
                return;
            }

            const sendRequest = (msg: string) => {
                ws.send(msg);
            };

            const appId = localStorage.getItem('app_session_id');

            if (!appId) {
                console.error('Application session ID is not set');
                return;
            }

            await closeApplicationSessionMessage(
                messageSigner,
                sendRequest,
                appId as Hex,
                account,
                process.env.NEXT_PUBLIC_CP_SESSION_KEY_PUBLIC_KEY as Address,
                '0.001',
                payerIndex
            );
        },
        [closeApplicationSessionMessage, messageSigner, ws]
    );

    return {
        isAuthenticated,
        connect,
        fetchBalances,
        createApplicationSession,
        closeApplicationSession,
    };
};
