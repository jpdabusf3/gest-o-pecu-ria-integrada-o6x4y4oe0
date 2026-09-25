import PocketBase from 'pocketbase'

const pb = new PocketBase(
  import.meta.env.VITE_POCKETBASE_URL ||
    'https://gestao-pecuaria-integrada-96d74.shrd00.internal.goskip.dev',
)

export { pb }
export default pb
