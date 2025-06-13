import { createGetLedgerBalancesMessage, MessageSigner } from '@erc7824/nitrolite';
import { useCallback, useEffect, useState } from 'react';
import { Address } from 'viem';

export const useGetLedgerBalances = (ws: WebSocket | null, signer: MessageSigner) => {
    const [refetchBalanceWith, setRefetchBalanceWith] = useState<Address | null>();

    const getLedgerBalances = useCallback(
        async (account: Address) => {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                throw new Error('WebSocket is not connected');
            }

            try {
                // Create the message to get ledger balances
                const message = await createGetLedgerBalancesMessage(signer, account);

                // Send the message to the ClearNode
                ws.send(message);
            } catch (error) {
                console.error('Error getting ledger balances:', error);
                throw new Error('Failed to get ledger balances');
            }
        },
        [signer, ws]
    );

    useEffect(() => {
        if (refetchBalanceWith) {
            // Trigger a refetch of the ledger balances
            setRefetchBalanceWith(null);

            getLedgerBalances(refetchBalanceWith);
        }
    }, [refetchBalanceWith]);

    const refetchBalances = useCallback((account: Address) => {
        setRefetchBalanceWith(account);
    }, []);

    return { getLedgerBalances, refetchBalances };
};
