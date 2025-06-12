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
    RPCChannelStatus,
    RPCMethod,
} from '@erc7824/nitrolite';
import { useCallback, useEffect, useState } from 'react';
import { Address, Hex, WalletClient } from 'viem';
import { useSessionKey } from './useStateWallet';
import { useCreateApplicationSession } from './useCreateApplicationSession';
import { useCloseApplicationSession } from './useCloseApplicationSession';

interface UseClearNodeState {
    isAuthenticated: boolean;
    connect: (walletClient: WalletClient) => Promise<void>;
    fetchBalances: (account: Address) => Promise<void>;
    createApplicationSession: (account: Address) => Promise<void>;
    closeApplicationSession: (account: Address, payerIndex: 0 | 1) => Promise<void>;
    usdcBalance: string;
}

export const useClearNode = (): UseClearNodeState => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [usdcBalance, setUSDCBalance] = useState<string>('0');

    const { address: sessionKeyAddress, signer: messageSigner } = useSessionKey();

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
                        case RPCMethod.AuthChallenge:
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
                        case RPCMethod.AuthVerify:
                            if (!message.params.success) {
                                return;
                            }

                            setIsAuthenticated(true);

                            if (message.params.jwtToken) {
                                window.localStorage.setItem('clearnode_jwt', message.params.jwtToken);
                            }
                            break;
                        case RPCMethod.Error:
                            console.error('Authentication failed:', message.params.error);
                            return;
                        case RPCMethod.GetLedgerBalances:
                            console.log(message);
                            const balance = message.params.find((a) => a.asset === 'usdc');
                            setUSDCBalance(balance ? balance.amount : '0');
                            return;
                        case RPCMethod.CreateAppSession:
                            const appSessionId = message.params.app_session_id
                            localStorage.setItem('app_session_id', appSessionId);
                            return;
                        case RPCMethod.CloseAppSession:
                            if (message.params.status === RPCChannelStatus.Closed) {
                                localStorage.removeItem('app_session_id');
                            }
                            return;
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

            const msg = await createApplicationSessionMessage(
                messageSigner,
                account,
                process.env.NEXT_PUBLIC_CP_SESSION_KEY_PUBLIC_KEY as Address,
                '0.001'
            );

            ws.send(msg);
        },
        [createApplicationSessionMessage, messageSigner, ws]
    );

    const closeApplicationSession = useCallback(
        async (account: Address, payerIndex: 0 | 1) => {
            if (!ws) {
                console.error('WebSocket is not connected');
                return;
            }
            const appId = localStorage.getItem('app_session_id');

            if (!appId) {
                console.error('Application session ID is not set');
                return;
            }

            const msg = await closeApplicationSessionMessage(
                messageSigner,
                appId as Hex,
                account,
                process.env.NEXT_PUBLIC_CP_SESSION_KEY_PUBLIC_KEY as Address,
                '0.001',
                payerIndex
            );

            ws.send(msg);
        },
        [closeApplicationSessionMessage, messageSigner, ws]
    );

    return {
        isAuthenticated,
        connect,
        fetchBalances,
        createApplicationSession,
        closeApplicationSession,
        usdcBalance,
    };
};
