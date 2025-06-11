import { createAppSessionMessage, MessageSigner } from '@erc7824/nitrolite';
import { useCallback } from 'react';
import { Address } from 'viem';

export const useCreateApplicationSession = () => {
    const createApplicationSession = useCallback(
        async (
            signer: MessageSigner,
            sendRequest: (message: string) => void,
            participantA: Address,
            participantB: Address,
            amount: string
        ) => {
            try {
                // Define the application parameters
                const appDefinition = {
                    protocol: 'nitroliterpc',
                    participants: [participantA, participantB],
                    weights: [100, 0], // Weight distribution for consensus
                    quorum: 100, // Required consensus percentage
                    challenge: 0, // Challenge period
                    nonce: Date.now(), // Unique identifier
                };

                // Define allocations with asset type instead of token address
                const allocations = [
                    {
                        participant: participantA,
                        asset: 'usdc',
                        amount: amount,
                    },
                    {
                        participant: participantB,
                        asset: 'usdc',
                        amount: '0',
                    },
                ];

                // Create a signed message using the createAppSessionMessage helper
                const signedMessage = await createAppSessionMessage(signer, [
                    {
                        definition: appDefinition,
                        allocations: allocations,
                    },
                ]);

                // Send the signed message to the ClearNode
                sendRequest(signedMessage);
            } catch (error) {
                console.error('Error creating application session:', error);
                throw new Error('Failed to create application session');
            }
        },
        []
    );

    return { createApplicationSession };
};
