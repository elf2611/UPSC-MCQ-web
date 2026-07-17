export interface RSSSource {
  id: string;
  name: string;
  url: string;
  defaultSubject: string;
}

export const CURRENT_AFFAIRS_SOURCES: RSSSource[] = [
  {
    id: 'the-hindu',
    name: 'The Hindu',
    url: 'https://www.thehindu.com/feeder/default.rss',
    defaultSubject: 'Current Affairs'
  },
  {
    id: 'indian-express',
    name: 'The Indian Express',
    url: 'https://indianexpress.com/feed/',
    defaultSubject: 'Current Affairs'
  },
  {
    id: 'pib',
    name: 'Press Information Bureau (PIB)',
    url: 'https://pib.gov.in/feeder/default.rss', // Using placeholder structure if PIB doesn't have standard feed
    defaultSubject: 'Government Schemes & Policies'
  },
  {
    id: 'prs-india',
    name: 'PRS Legislative Research',
    url: 'https://prsindia.org/feed', // Placeholder structure
    defaultSubject: 'Polity & Governance'
  },
  {
    id: 'yojana',
    name: 'Yojana Magazine',
    url: 'https://yojana.gov.in/feed', // Placeholder structure
    defaultSubject: 'Economy & Development'
  }
];
