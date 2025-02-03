import { atom } from 'jotai';

type CoinMetaData = Object

export const coinAtom = atom<CoinMetaData | null>(null);
