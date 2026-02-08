const ERC20 = await import('./ERC20.json', {
    with: { type: 'json' }
});

export const ERC20_ABI = ERC20.abi;
