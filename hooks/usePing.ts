import { createPingMessage, MessageSigner } from '@erc7824/nitrolite';
import { useEffect } from 'react';

export const usePing = (ws: WebSocket | null, signer: MessageSigner) => {
    useEffect(() => {
        if (!ws) {
            return;
        }

        const interval = setInterval(async () => {
            if (ws.readyState === WebSocket.OPEN) {
                const msg = await createPingMessage(signer);

                ws.send(msg);
            } else {
                console.warn('WebSocket is not open, attempting to reconnect...');
                ws.close();
            }
        }, 10000);

        return () => {
            clearInterval(interval);
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [!!ws]);
};
