import { MessageSigner, RequestData, ResponsePayload } from '@erc7824/nitrolite';
import { ethers } from 'ethers';
import { useCallback, useMemo } from 'react';
import { Hex } from 'viem';

export const useSessionKey = () => {
    // Create ethers wallet from private key
    const wallet = useMemo(() => {
        return new ethers.Wallet(process.env.NEXT_PUBLIC_SESSION_KEY_PRIVATE_KEY || '');
    }, []);

    const sign: MessageSigner = useCallback(
        async (payload: RequestData | ResponsePayload): Promise<Hex> => {
            try {
                const messageBytes = ethers.utils.arrayify(ethers.utils.id(JSON.stringify(payload)));

                const flatSignature = await wallet._signingKey().signDigest(messageBytes);

                const signature = ethers.utils.joinSignature(flatSignature);

                return signature as Hex;
            } catch (error) {
                console.error('Error signing message:', error);
                throw error;
            }
        },
        [wallet]
    );

    return {
        publicKey: wallet.publicKey,
        address: wallet.address as Hex,
        sign,
    };
};
