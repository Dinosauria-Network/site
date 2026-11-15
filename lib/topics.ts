import { getPublishedStories } from '@/lib/db/stories';
import type { NewsPost } from '@/lib/genus-data';

export interface Topic {
  slug: string;
  name: string;
  description: string;
  keywords: string[];
}

/**
 * News topics — a story matches a topic when any keyword (case-insensitive,
 * substring) appears in its headline or description. Topics are intentionally
 * subject-first (taxa and themes) so readers can browse the news archive by
 * what it is about rather than by academic category.
 */
export const TOPICS: Topic[] = [
  {
    slug: 'theropods',
    name: 'Theropods',
    description:
      'Bipedal, mostly carnivorous dinosaurs — tyrannosaurs, spinosaurs, abelisaurs and relatives.',
    keywords: [
      'theropod',
      'tyrannosaur',
      't. rex',
      'abellisaur',
      'ceratosaur',
      'maniraptor',
      'ornithomim',
      'dromaeosaur',
      'troodont',
      'allosaur',
      'spinosaur',
      'carcharodontosaur',
      'megalosaur',
      'neovenator',
      'therizinosaur',
      'oviraptor',
      'albertosaur',
      'gorgosaurus',
      'daspletosaurus',
      'tarbosaurus',
      'nanotyrannus',
      'giganotosaurus',
      'carnotaurus',
      'majungasaurus',
    ],
  },
  {
    slug: 'sauropods',
    name: 'Sauropods',
    description:
      'Long-necked giants — titanosaurs, diplodocids, brachiosaurs and the largest animals to walk the Earth.',
    keywords: [
      'sauropod',
      'titanosaur',
      'diplodoc',
      'brachiosaur',
      'camarasaur',
      'turiasaur',
      'neosauropod',
      'somphospondyl',
      'macronarian',
      'patagotitan',
      'dreadnoughtus',
      'argentinosaurus',
      'saltasaur',
      'amargasaurus',
    ],
  },
  {
    slug: 'ornithischians',
    name: 'Ornithischians',
    description:
      'Beaked herbivores — ceratopsians, hadrosaurs, stegosaurs, ankylosaurs and pachycephalosaurs.',
    keywords: [
      'ornithischia',
      'ceratops',
      'centrosaur',
      'chasmosaur',
      'hadrosaur',
      'stegosaur',
      'ankylosaur',
      'ornithopod',
      'pachycephalosaur',
      'iguanodont',
      'hypsilophodont',
      'thyreophoran',
      'marginocephalian',
      'lokiceratops',
      'triceratops',
    ],
  },
  {
    slug: 'pterosaurs',
    name: 'Pterosaurs',
    description:
      'Flying reptiles of the Mesozoic — pteranodonts, azhdarchids, tapejarids and ornithocheiroids.',
    keywords: [
      'pterosaur',
      'pterodactyl',
      'rhamphorhynch',
      'anhanguer',
      'azhdarchid',
      'pteranodon',
      'tapejarid',
      'dsungaripter',
      'ornithocheir',
      'ctenochasmat',
    ],
  },
  {
    slug: 'feathered-dinosaurs',
    name: 'Feathered Dinosaurs',
    description:
      'Fossil feathers, plumage and feathered integument across the dinosaur family tree.',
    keywords: ['feather', 'plumage', 'integumentary', 'pycnofibre', 'pycnofiber'],
  },
  {
    slug: 'extinction',
    name: 'Extinction Events',
    description:
      'Mass extinctions, impact boundaries and the end of the age of dinosaurs.',
    keywords: [
      'extinction',
      'k-pg',
      'k/t',
      'cretaceous–paleogene',
      'cretaceous-paleogene',
      'mass extinction',
      'impact',
      'chicxulub',
      'end-cretaceous',
      'boundary',
    ],
  },
  {
    slug: 'trace-fossils',
    name: 'Trace Fossils',
    description:
      'Tracks, footprints, burrows and resting traces left by extinct animals.',
    keywords: [
      'tracksite',
      'footprint',
      'track',
      'resting trace',
      'burrow',
      'ichnite',
      'ichnology',
    ],
  },
  {
    slug: 'bone-biology',
    name: 'Bone Biology',
    description:
      'Bone histology, growth rates, pathology and biomechanics in fossil skeletons.',
    keywords: [
      'osteohistology',
      'histolog',
      'cortical bone',
      'bone geometry',
      'biomechanic',
      'growth rate',
      'bone microstructure',
      'patholog',
      'dentition',
      'tooth replacement',
    ],
  },
  {
    slug: 'early-dinosaurs',
    name: 'Early Dinosaurs',
    description: 'Triassic origins and the earliest known dinosauriforms.',
    keywords: [
      'triassic',
      'earliest',
      'dinosauriform',
      'silesaurid',
      'dinosauromorph',
      'basal dinosaur',
      'origin of dinosaurs',
      'middle triassic',
      'late triassic',
    ],
  },
  {
    slug: 'marine-reptiles',
    name: 'Marine Reptiles',
    description:
      'Ichthyosaurs, mosasaurs, plesiosaurs and thalattosuchians of Mesozoic seas.',
    keywords: [
      'ichthyosaur',
      'mosasaur',
      'plesiosaur',
      'elasmosaur',
      'thalattosuchian',
      'teleosauroid',
      'metriorhynchid',
      'marine reptile',
    ],
  },
];

export function storyMatchesTopic(post: NewsPost, topic: Topic): boolean {
  const haystack = `${post.title} ${post.excerpt}`.toLowerCase();
  return topic.keywords.some((k) => haystack.includes(k.toLowerCase()));
}

/** Published stories matching a topic, newest first. Returns null for unknown slugs. */
export async function getTopicStories(
  slug: string,
): Promise<{ topic: Topic; posts: NewsPost[] } | null> {
  const topic = TOPICS.find((t) => t.slug === slug);
  if (!topic) return null;
  const all = await getPublishedStories();
  return { topic, posts: all.filter((p) => storyMatchesTopic(p, topic)) };
}

/** Counts of published stories per topic (for the topic index page). */
export async function getTopicCounts() {
  const all = await getPublishedStories();
  const countMap = new Map<string, number>();
  for (const post of all) {
    for (const topic of TOPICS) {
      if (storyMatchesTopic(post, topic)) {
        countMap.set(topic.slug, (countMap.get(topic.slug) ?? 0) + 1);
      }
    }
  }
  return TOPICS.map((topic) => ({ topic, count: countMap.get(topic.slug) ?? 0 }));
}

export default TOPICS;
