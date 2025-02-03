import { formatBalance } from '@/utils';
import { getSuiBalance } from '@/contracts/query';
import type { WalletAccount } from '@mysten/wallet-standard';
import { useEffect, useState } from 'react';

type BalanceProps = {
  currentAccount: WalletAccount
}

export default function Balance({currentAccount}: BalanceProps) {

  const [balance, setBalance] = useState('')

  useEffect(() => {
    async function fetchBalance() {
      if (currentAccount?.address) {
        try {
          const profile = await getSuiBalance(currentAccount.address);
          setBalance(profile);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    }

    fetchBalance();
  }, [currentAccount]);

  return <div className="text-sm bg-black rounded-sm px-1 flex items-center">
    <i className='icon-[token-branded--sui]' />
    <span className='mx-1 text-center font-bold'>{ balance ? formatBalance(balance) || 0 : '-'}</span>
  </div>
}
