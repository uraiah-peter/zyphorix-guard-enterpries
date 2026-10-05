// ─── MITRE ATT&CK Mapper ──────────────────────────────────────────────────
// Enriches technique IDs with human-readable names and tactic context.

interface MitreTechnique {
  id: string;
  name: string;
  tactic: string;
  url: string;
}

const TECHNIQUE_DB: Record<string, MitreTechnique> = {
  'T1566':       { id:'T1566',     name:'Phishing',                                tactic:'Initial Access',     url:'https://attack.mitre.org/techniques/T1566/' },
  'T1566.001':   { id:'T1566.001', name:'Phishing: Spearphishing Attachment',       tactic:'Initial Access',     url:'https://attack.mitre.org/techniques/T1566/001/' },
  'T1566.002':   { id:'T1566.002', name:'Phishing: Spearphishing Link',             tactic:'Initial Access',     url:'https://attack.mitre.org/techniques/T1566/002/' },
  'T1204':       { id:'T1204',     name:'User Execution',                           tactic:'Execution',          url:'https://attack.mitre.org/techniques/T1204/' },
  'T1204.002':   { id:'T1204.002', name:'User Execution: Malicious File',           tactic:'Execution',          url:'https://attack.mitre.org/techniques/T1204/002/' },
  'T1027':       { id:'T1027',     name:'Obfuscated Files or Information',          tactic:'Defense Evasion',    url:'https://attack.mitre.org/techniques/T1027/' },
  'T1036':       { id:'T1036',     name:'Masquerading',                             tactic:'Defense Evasion',    url:'https://attack.mitre.org/techniques/T1036/' },
  'T1036.007':   { id:'T1036.007', name:'Masquerading: Double File Extension',      tactic:'Defense Evasion',    url:'https://attack.mitre.org/techniques/T1036/007/' },
  'T1056.003':   { id:'T1056.003', name:'Input Capture: Web Portal Capture',        tactic:'Credential Access',  url:'https://attack.mitre.org/techniques/T1056/003/' },
  'T1534':       { id:'T1534',     name:'Internal Spearphishing',                   tactic:'Lateral Movement',   url:'https://attack.mitre.org/techniques/T1534/' },
  'T1583':       { id:'T1583',     name:'Acquire Infrastructure',                   tactic:'Resource Development',url:'https://attack.mitre.org/techniques/T1583/' },
  'T1583.001':   { id:'T1583.001', name:'Acquire Infrastructure: Domains',          tactic:'Resource Development',url:'https://attack.mitre.org/techniques/T1583/001/' },
  'T1583.003':   { id:'T1583.003', name:'Acquire Infrastructure: Virtual Private Server',tactic:'Resource Development',url:'https://attack.mitre.org/techniques/T1583/003/' },
  'T1090.003':   { id:'T1090.003', name:'Proxy: Multi-hop Proxy',                   tactic:'Command and Control',url:'https://attack.mitre.org/techniques/T1090/003/' },
  'T1568.002':   { id:'T1568.002', name:'Dynamic Resolution: Domain Generation Algorithms',tactic:'Command and Control',url:'https://attack.mitre.org/techniques/T1568/002/' },
  'T1190':       { id:'T1190',     name:'Exploit Public-Facing Application',         tactic:'Initial Access',     url:'https://attack.mitre.org/techniques/T1190/' },
};

export function enrichMitreId(techniqueId: string): MitreTechnique | null {
  return TECHNIQUE_DB[techniqueId] ?? null;
}

export function buildMitreMapping(techniqueIds: string[]): MitreTechnique[] {
  const unique = [...new Set(techniqueIds)];
  return unique.map(id => TECHNIQUE_DB[id]).filter(Boolean) as MitreTechnique[];
}

export function groupByTactic(techniques: MitreTechnique[]): Record<string, MitreTechnique[]> {
  return techniques.reduce((acc, t) => {
    if (!acc[t.tactic]) acc[t.tactic] = [];
    acc[t.tactic].push(t);
    return acc;
  }, {} as Record<string, MitreTechnique[]>);
}
