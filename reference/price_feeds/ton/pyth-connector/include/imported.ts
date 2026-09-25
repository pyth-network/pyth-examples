/** A data source is a wormhole emitter, i.e., a specific contract on a specific chain. */
export interface DataSource {
    emitterChain: number;
    emitterAddress: string;
}