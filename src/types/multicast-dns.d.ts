declare namespace mdns
{
    type MdnsRecordType = 'A' | 'PTR' | 'SRV' | 'TXT';

    interface MdnsServerData {
        port: number;
        priority: number;
        target: string;
        weight: number;
    }

    interface MdnsAnswer {
        class: string;
        data: unknown;
        flush: boolean;
        name: string;
        ttl: number;
        type: MdnsRecordType;
    }

    interface MdnsAddressAnswer extends MdnsAnswer {
        data: string;
        type: 'A';
    }

    interface MdnsPointerAnswer extends MdnsAnswer {
        data: string;
        type: 'PTR';
    }

    interface MdnsServerAnswer extends MdnsAnswer {
        data: MdnsServerData;
        type: 'SRV';
    }

    interface MdnsTextAnswer extends MdnsAnswer {
        data: Buffer[];
        type: 'TXT';
    }

    interface MdnsQuestion {
        name: string;
        type: MdnsRecordType;
    }

    interface MdnsPacket {
        additionals: MdnsAnswer[];
        answers: MdnsAnswer[];
        flag_aa: boolean;
        flag_ad: boolean;
        flag_cd: boolean;
        flag_qr: boolean;
        flag_ra: boolean;
        flag_rd: boolean;
        flag_tc: boolean;
        flag_z: boolean;
        flags: number;
        id: number;
        opcode: string;
        rcode: string;
        type: string;
    }

    interface MdnsResponseInfo {
        address: string;
        family: string;
        port: number;
        size: number;
    }

    interface MdnsQuery {
        questions: MdnsQuestion[];
    }

    interface MdnsInstance extends NodeJS.EventEmitter {
        destroy(): void;
        on(name: 'response', callback: (packet: MdnsPacket, rinfo: MdnsResponseInfo) => void): this;
        query(query: MdnsQuery, callback: (err: Error | undefined) => void): void;
    }

    function MdnsInstanceFactory(): MdnsInstance;
}

declare module 'multicast-dns' {
    export = mdns.MdnsInstanceFactory;
}