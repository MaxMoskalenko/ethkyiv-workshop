/* eslint-disable max-len */

import {
    Allowance,
    AuthRequest,
    createAuthRequestMessage,
    createAuthVerifyMessage,
    createAuthVerifyMessageWithJWT,
    createEIP712AuthMessageSigner,
    GetLedgerBalancesRPCResponseParams,
    parseRPCResponse,
    RPCChannelStatus,
    RPCMethod,
} from '@erc7824/nitrolite';
import { useCallback, useState } from 'react';
import { Address, Hex, WalletClient } from 'viem';
import { useSessionKey } from './useSessionKey';
import { useCreateApplicationSession } from './useCreateApplicationSession';
import { useCloseApplicationSession } from './useCloseApplicationSession';
import { usePing } from './usePing';
import { useGetLedgerBalances } from './useGetLedgerBalances';

interface UseClearNodeState {
    isAuthenticated: boolean;
    connect: (walletClient: WalletClient) => Promise<void>;
    getLedgerBalances: (account: Address) => Promise<void>;
    createApplicationSession: (myAccount: Address) => Promise<void>;
    closeApplicationSession: (myAccount: Address, receiverIndex: 0 | 1) => Promise<void>;
    usdcBalance: string;
}

export const useClearNode = (): UseClearNodeState => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [usdcBalance, setUSDCBalance] = useState<string>('0');

    const { address: sessionKeyAddress, signer } = useSessionKey(process.env.NEXT_PUBLIC_SESSION_KEY_PRIVATE_KEY as Hex);

    const { createApplicationSession } = useCreateApplicationSession(ws, signer);
    const { closeApplicationSession } = useCloseApplicationSession(ws, signer);
    const { getLedgerBalances, refetchBalances } = useGetLedgerBalances(ws, signer);

    usePing(ws, signer);

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
                            const balance = (message.params[0] as unknown as GetLedgerBalancesRPCResponseParams[]).find((a) => a.asset === 'usdc');
                            setUSDCBalance(balance ? balance.amount : '0');
                            return;
                        case RPCMethod.CreateAppSession:
                            const appSessionId = message.params.app_session_id;
                            localStorage.setItem('app_session_id', appSessionId);
                            refetchBalances(walletClient.account!.address);
                            return;
                        case RPCMethod.CloseAppSession:
                            if (message.params.status === RPCChannelStatus.Closed) {
                                localStorage.removeItem('app_session_id');
                                refetchBalances(walletClient.account!.address);
                            }
                            return;
                    }
                } catch (error) {
                    console.error('Error handling message:', error);
                }
            };
        },
        [refetchBalances]
    );

    const connect = useCallback(
        async (walletClient: WalletClient) => {
            if (!walletClient) {
                console.error('Wallet client is not initialized');
                return;
            }

            const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL as string);

            const authRequestParams: AuthRequest = {
                wallet: walletClient.account!.address,
                participant: sessionKeyAddress,
                app_name: 'Your Domain',
                expire: String(Math.floor(Date.now() / 1000) + 3600), // 1 hour expiration
                scope: 'console',
                application: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
                allowances: [
                    {
                        symbol: 'usdc',
                        amount: '1',
                    },
                ],
            };

            ws.onopen = getOnConnectCallback(ws, authRequestParams);

            ws.onmessage = getOnMessageCallback(ws, walletClient, authRequestParams);

            setWs(ws);
        },
        [getOnConnectCallback, getOnMessageCallback, sessionKeyAddress]
    );

    return {
        isAuthenticated,
        connect,
        createApplicationSession,
        closeApplicationSession,
        getLedgerBalances,
        usdcBalance,
    };
};
