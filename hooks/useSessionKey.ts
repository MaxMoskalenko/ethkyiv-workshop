import { MessageSigner, RequestData, ResponsePayload } from '@erc7824/nitrolite';
import { ethers } from 'ethers';
import { useCallback, useMemo } from 'react';
import { Address, Hex } from 'viem';

interface UseSessionKeyState {
    address: Address;
    signer: MessageSigner;
}

export const useSessionKey = (pk: Hex): UseSessionKeyState => {
    // Create ethers wallet from private key
    const wallet = useMemo(() => {
        return new ethers.Wallet(pk);
    }, [pk]);

    const signer: MessageSigner = useCallback(
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
        address: wallet.address as Hex,
        signer,
    };
};
