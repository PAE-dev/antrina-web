import { type LocaleCode } from '@antrina/contracts';

/**
 * Significados de las piedras (páginas `/significados/<piedra>`). Tono de tradición y cultura
 * ("se asocia con"), nunca promesas de salud: Google y Merchant Center penalizan esas afirmaciones.
 */
export interface StoneCopy {
  name: string;
  color: string;
  chakra: string;
  /** Una frase; también es la descripción para Google (máx. ~155 caracteres). */
  summary: string;
  meaning: string[];
  care: string;
}

export interface StoneEntry {
  id: string;
  slug: Record<LocaleCode, string>;
  /** Slug de categoría (intención) con la que más se relaciona. */
  intention: string;
  copy: Record<LocaleCode, StoneCopy>;
}

export const STONES: StoneEntry[] = [
  {
    id: 'citrino',
    slug: { es: 'citrino', en: 'citrine' },
    intention: 'abundancia',
    copy: {
      es: {
        name: 'Citrino',
        color: 'Amarillo a miel',
        chakra: 'Plexo solar',
        summary:
          'El citrino es la piedra de la abundancia: se asocia con la prosperidad, el optimismo y el impulso para empezar proyectos.',
        meaning: [
          'El citrino es un cuarzo de tonos amarillos que van del limón a la miel. Por su color de sol se lo conoce como “la piedra del comerciante”: muchas tradiciones lo colocan en cajas registradoras y escritorios para invitar a la prosperidad.',
          'Se asocia con la confianza en uno mismo, la claridad para decidir y el entusiasmo de los nuevos comienzos. Es la piedra afín de Géminis y una de las protagonistas de nuestros árboles de la abundancia.',
        ],
        care: 'Límpialo con un paño seco o apenas húmedo. Evita el sol directo durante horas: los citrinos pueden aclararse con el tiempo.',
      },
      en: {
        name: 'Citrine',
        color: 'Lemon to honey yellow',
        chakra: 'Solar plexus',
        summary:
          'Citrine is the stone of abundance: it is associated with prosperity, optimism and the drive to start new projects.',
        meaning: [
          'Citrine is a quartz in yellow tones ranging from lemon to honey. Because of its sunny color it is known as “the merchant’s stone”: many traditions place it by cash registers and desks to invite prosperity.',
          'It is associated with self-confidence, clear decisions and the excitement of new beginnings. It is the kindred stone of Gemini and one of the stars of our abundance trees.',
        ],
        care: 'Wipe with a dry or slightly damp cloth. Avoid hours of direct sunlight: citrine can fade over time.',
      },
    },
  },
  {
    id: 'pirita',
    slug: { es: 'pirita', en: 'pyrite' },
    intention: 'abundancia',
    copy: {
      es: {
        name: 'Pirita',
        color: 'Dorado metálico',
        chakra: 'Plexo solar',
        summary:
          'La pirita, el “oro de los tontos”, se asocia con la prosperidad, la protección y la fuerza de voluntad.',
        meaning: [
          'La pirita es un mineral de brillo dorado y cristales casi geométricos. Su parecido con el oro le dio el apodo de “oro de los tontos”, y desde entonces se la relaciona con la riqueza y la buena fortuna.',
          'Se asocia también con la protección y con la constancia para sostener los proyectos en el tiempo. En nuestros árboles aporta destellos metálicos que contrastan con la calidez del citrino.',
        ],
        care: 'Mantenla seca: la humedad puede opacar su brillo. Límpiala solo con un pincel suave o un paño seco.',
      },
      en: {
        name: 'Pyrite',
        color: 'Metallic gold',
        chakra: 'Solar plexus',
        summary: 'Pyrite, “fool’s gold”, is associated with prosperity, protection and willpower.',
        meaning: [
          'Pyrite is a mineral with a golden shine and almost geometric crystals. Its resemblance to gold earned it the nickname “fool’s gold”, and it has been linked to wealth and good fortune ever since.',
          'It is also associated with protection and the persistence to see projects through. In our trees it adds metallic sparkle that contrasts with the warmth of citrine.',
        ],
        care: 'Keep it dry: moisture can dull its shine. Clean only with a soft brush or a dry cloth.',
      },
    },
  },
  {
    id: 'cuarzo-rosa',
    slug: { es: 'cuarzo-rosa', en: 'rose-quartz' },
    intention: 'amor',
    copy: {
      es: {
        name: 'Cuarzo rosa',
        color: 'Rosa suave',
        chakra: 'Corazón',
        summary:
          'El cuarzo rosa es la piedra del amor: se asocia con la ternura, el amor propio y la armonía en las relaciones.',
        meaning: [
          'El cuarzo rosa es quizá la piedra más querida del mundo. Su rosa lechoso y suave lo convirtió en símbolo del amor en muchas culturas, desde el antiguo Egipto hasta hoy.',
          'Se asocia con el amor propio, la reconciliación y la calma en los vínculos. Es la piedra afín de Tauro y un regalo clásico para parejas, madres y amistades. En nuestro taller es la base de los árboles del amor.',
        ],
        care: 'Límpialo con agua tibia y un paño suave. Evita el sol directo prolongado para conservar su color.',
      },
      en: {
        name: 'Rose quartz',
        color: 'Soft pink',
        chakra: 'Heart',
        summary:
          'Rose quartz is the stone of love: it is associated with tenderness, self-love and harmony in relationships.',
        meaning: [
          'Rose quartz may be the most beloved stone in the world. Its soft, milky pink made it a symbol of love in many cultures, from ancient Egypt to today.',
          'It is associated with self-love, reconciliation and calm in relationships. It is the kindred stone of Taurus and a classic gift for partners, mothers and friends. In our workshop it is the heart of our love trees.',
        ],
        care: 'Clean with lukewarm water and a soft cloth. Avoid long exposure to direct sunlight to keep its color.',
      },
    },
  },
  {
    id: 'rodonita',
    slug: { es: 'rodonita', en: 'rhodonite' },
    intention: 'amor',
    copy: {
      es: {
        name: 'Rodonita',
        color: 'Rosa con vetas negras',
        chakra: 'Corazón',
        summary:
          'La rodonita se asocia con el perdón, la compasión y la sanación emocional de los vínculos.',
        meaning: [
          'La rodonita es una piedra rosa atravesada por vetas negras de manganeso. Esa mezcla de luz y sombra la convirtió en símbolo del equilibrio emocional.',
          'Se asocia con el perdón, la compasión y la capacidad de cerrar ciclos con cariño. Acompaña al cuarzo rosa en nuestros árboles del amor y les da un carácter más profundo.',
        ],
        care: 'Límpiala con un paño húmedo y sécala enseguida. No uses productos químicos.',
      },
      en: {
        name: 'Rhodonite',
        color: 'Pink with black veins',
        chakra: 'Heart',
        summary:
          'Rhodonite is associated with forgiveness, compassion and emotional healing in relationships.',
        meaning: [
          'Rhodonite is a pink stone crossed by black manganese veins. That mix of light and shadow made it a symbol of emotional balance.',
          'It is associated with forgiveness, compassion and the ability to close chapters with care. It joins rose quartz in our love trees and gives them a deeper character.',
        ],
        care: 'Wipe with a damp cloth and dry right away. Do not use chemicals.',
      },
    },
  },
  {
    id: 'turmalina-negra',
    slug: { es: 'turmalina-negra', en: 'black-tourmaline' },
    intention: 'proteccion',
    copy: {
      es: {
        name: 'Turmalina negra',
        color: 'Negro profundo',
        chakra: 'Raíz',
        summary:
          'La turmalina negra es la gran piedra de protección: se asocia con resguardar los espacios y mantener los pies en la tierra.',
        meaning: [
          'La turmalina negra, o chorlo, forma cristales alargados de un negro intenso. Es una de las piedras más usadas tradicionalmente para proteger el hogar y los lugares de trabajo.',
          'Se asocia con la estabilidad, el enraizamiento y la sensación de estar a salvo. Es la piedra afín de Capricornio y la base de nuestros árboles de protección, junto a la amatista.',
        ],
        care: 'Quítale el polvo con un pincel suave. Es una piedra resistente, pero evita los golpes en sus cristales.',
      },
      en: {
        name: 'Black tourmaline',
        color: 'Deep black',
        chakra: 'Root',
        summary:
          'Black tourmaline is the great stone of protection: it is associated with shielding spaces and staying grounded.',
        meaning: [
          'Black tourmaline, or schorl, forms long crystals of an intense black. It is one of the stones most traditionally used to protect homes and workplaces.',
          'It is associated with stability, grounding and a sense of safety. It is the kindred stone of Capricorn and the base of our protection trees, together with amethyst.',
        ],
        care: 'Dust it with a soft brush. It is a sturdy stone, but avoid knocks to its crystals.',
      },
    },
  },
  {
    id: 'amatista',
    slug: { es: 'amatista', en: 'amethyst' },
    intention: 'proteccion',
    copy: {
      es: {
        name: 'Amatista',
        color: 'Violeta',
        chakra: 'Corona',
        summary:
          'La amatista se asocia con la calma, la intuición y la protección. Es la piedra afín de Acuario y el color de Antrina.',
        meaning: [
          'La amatista es un cuarzo violeta cuyo nombre griego significa “no ebrio”: en la Antigüedad se creía que protegía de los excesos. Desde entonces se relaciona con la templanza y la claridad.',
          'Se asocia con la calma, el buen descanso, la intuición y la espiritualidad. Es la piedra afín de Acuario y su violeta es el color de nuestra marca. La usamos en árboles de protección y en las bases de la Edición Firma.',
        ],
        care: 'Límpiala con agua tibia y un paño suave. Evita el sol directo: el violeta puede aclararse.',
      },
      en: {
        name: 'Amethyst',
        color: 'Violet',
        chakra: 'Crown',
        summary:
          'Amethyst is associated with calm, intuition and protection. It is the kindred stone of Aquarius and the color of Antrina.',
        meaning: [
          'Amethyst is a violet quartz whose Greek name means “not drunk”: in ancient times it was believed to guard against excess. It has been linked to temperance and clarity ever since.',
          'It is associated with calm, restful sleep, intuition and spirituality. It is the kindred stone of Aquarius and its violet is our brand color. We use it in protection trees and in the bases of our Signature Edition.',
        ],
        care: 'Clean with lukewarm water and a soft cloth. Avoid direct sunlight: the violet can fade.',
      },
    },
  },
  {
    id: 'cornalina',
    slug: { es: 'cornalina', en: 'carnelian' },
    intention: 'felicidad',
    copy: {
      es: {
        name: 'Cornalina',
        color: 'Naranja a rojo',
        chakra: 'Sacro',
        summary:
          'La cornalina se asocia con la alegría, la creatividad y el coraje para empezar. Es la piedra afín de Aries.',
        meaning: [
          'La cornalina es una calcedonia de tonos naranjas y rojizos, translúcida a contraluz. Los artesanos del antiguo Egipto y de Roma la tallaban en sellos y amuletos.',
          'Se asocia con la vitalidad, la creatividad, la motivación y las ganas de empezar. Es la piedra afín de Aries y la protagonista de nuestros árboles de la felicidad.',
        ],
        care: 'Límpiala con agua y jabón neutro y sécala bien. Resiste bien el uso diario.',
      },
      en: {
        name: 'Carnelian',
        color: 'Orange to red',
        chakra: 'Sacral',
        summary:
          'Carnelian is associated with joy, creativity and the courage to begin. It is the kindred stone of Aries.',
        meaning: [
          'Carnelian is a chalcedony in orange and reddish tones, translucent against the light. Craftsmen in ancient Egypt and Rome carved it into seals and amulets.',
          'It is associated with vitality, creativity, motivation and the urge to begin. It is the kindred stone of Aries and the star of our happiness trees.',
        ],
        care: 'Clean with water and mild soap and dry well. It stands up well to everyday handling.',
      },
    },
  },
  {
    id: 'ojo-de-tigre',
    slug: { es: 'ojo-de-tigre', en: 'tigers-eye' },
    intention: 'felicidad',
    copy: {
      es: {
        name: 'Ojo de tigre',
        color: 'Dorado y marrón con brillo sedoso',
        chakra: 'Plexo solar',
        summary:
          'El ojo de tigre se asocia con la confianza, el valor y la buena suerte. Es la piedra afín de Leo.',
        meaning: [
          'El ojo de tigre tiene bandas doradas y marrones que se mueven con la luz, como la mirada de un felino. Ese efecto, llamado chatoyancia, lo hizo popular como amuleto en muchas culturas.',
          'Se asocia con la confianza en uno mismo, el valor para decidir y la buena suerte. Es la piedra afín de Leo y aporta calidez a nuestros árboles de la felicidad.',
        ],
        care: 'Límpialo con un paño suave. Evita productos abrasivos para no perder su brillo sedoso.',
      },
      en: {
        name: 'Tiger’s eye',
        color: 'Golden brown with a silky sheen',
        chakra: 'Solar plexus',
        summary:
          'Tiger’s eye is associated with confidence, courage and good luck. It is the kindred stone of Leo.',
        meaning: [
          'Tiger’s eye has golden and brown bands that shift with the light, like a cat’s gaze. That effect, called chatoyancy, made it a popular amulet in many cultures.',
          'It is associated with self-confidence, the courage to decide and good luck. It is the kindred stone of Leo and brings warmth to our happiness trees.',
        ],
        care: 'Clean with a soft cloth. Avoid abrasive products to keep its silky sheen.',
      },
    },
  },
  {
    id: 'piedra-luna',
    slug: { es: 'piedra-luna', en: 'moonstone' },
    intention: 'amor',
    copy: {
      es: {
        name: 'Piedra luna',
        color: 'Blanco nacarado con reflejos azules',
        chakra: 'Corona',
        summary:
          'La piedra luna se asocia con la intuición, los ciclos y la sensibilidad. Es la piedra afín de Cáncer.',
        meaning: [
          'La piedra luna muestra un brillo azulado que parece flotar bajo su superficie, como la luz de la luna sobre el agua. En la India se la considera sagrada y se regala en compromisos.',
          'Se asocia con la intuición, la sensibilidad y los nuevos ciclos. Es la piedra afín de Cáncer, el signo regido por la Luna.',
        ],
        care: 'Es delicada: límpiala con un paño suave y guárdala lejos de golpes y de cambios bruscos de temperatura.',
      },
      en: {
        name: 'Moonstone',
        color: 'Pearly white with blue flashes',
        chakra: 'Crown',
        summary:
          'Moonstone is associated with intuition, cycles and sensitivity. It is the kindred stone of Cancer.',
        meaning: [
          'Moonstone shows a bluish glow that seems to float beneath its surface, like moonlight on water. In India it is considered sacred and given at engagements.',
          'It is associated with intuition, sensitivity and new cycles. It is the kindred stone of Cancer, the sign ruled by the Moon.',
        ],
        care: 'It is delicate: clean with a soft cloth and keep it away from knocks and sudden temperature changes.',
      },
    },
  },
  {
    id: 'amazonita',
    slug: { es: 'amazonita', en: 'amazonite' },
    intention: 'felicidad',
    copy: {
      es: {
        name: 'Amazonita',
        color: 'Verde agua',
        chakra: 'Corazón y garganta',
        summary:
          'La amazonita se asocia con la serenidad, la comunicación honesta y el equilibrio. Es la piedra afín de Virgo.',
        meaning: [
          'La amazonita es un feldespato de un verde agua muy característico, a veces con vetas blancas. Su color recuerda al de los ríos y le dio su nombre.',
          'Se asocia con la serenidad, el equilibrio y la comunicación sincera. Es la piedra afín de Virgo, un signo que valora el orden y la calma.',
        ],
        care: 'Límpiala con un paño seco. Evita el agua caliente y el sol directo prolongado.',
      },
      en: {
        name: 'Amazonite',
        color: 'Sea green',
        chakra: 'Heart and throat',
        summary:
          'Amazonite is associated with serenity, honest communication and balance. It is the kindred stone of Virgo.',
        meaning: [
          'Amazonite is a feldspar in a very distinctive sea green, sometimes with white veins. Its color recalls river water and gave it its name.',
          'It is associated with serenity, balance and sincere communication. It is the kindred stone of Virgo, a sign that values order and calm.',
        ],
        care: 'Wipe with a dry cloth. Avoid hot water and long exposure to direct sunlight.',
      },
    },
  },
  {
    id: 'lapislazuli',
    slug: { es: 'lapislazuli', en: 'lapis-lazuli' },
    intention: 'proteccion',
    copy: {
      es: {
        name: 'Lapislázuli',
        color: 'Azul intenso con destellos dorados',
        chakra: 'Tercer ojo',
        summary:
          'El lapislázuli se asocia con la sabiduría, la verdad y la armonía. Es la piedra afín de Libra.',
        meaning: [
          'El lapislázuli es una roca de azul profundo salpicada de pirita dorada, como un cielo estrellado. Fue molido para pintar los mantos más valiosos del Renacimiento y adornó la máscara de Tutankamón.',
          'Se asocia con la sabiduría, la honestidad y la armonía en las decisiones. Es la piedra afín de Libra, el signo de la balanza.',
        ],
        care: 'Es porosa: límpiala solo con un paño seco y evita el agua, los perfumes y los productos químicos.',
      },
      en: {
        name: 'Lapis lazuli',
        color: 'Deep blue with golden flecks',
        chakra: 'Third eye',
        summary:
          'Lapis lazuli is associated with wisdom, truth and harmony. It is the kindred stone of Libra.',
        meaning: [
          'Lapis lazuli is a deep blue rock flecked with golden pyrite, like a starry sky. It was ground to paint the most precious robes of the Renaissance and adorned Tutankhamun’s mask.',
          'It is associated with wisdom, honesty and harmony in decisions. It is the kindred stone of Libra, the sign of the scales.',
        ],
        care: 'It is porous: clean only with a dry cloth and avoid water, perfume and chemicals.',
      },
    },
  },
  {
    id: 'obsidiana',
    slug: { es: 'obsidiana', en: 'obsidian' },
    intention: 'proteccion',
    copy: {
      es: {
        name: 'Obsidiana',
        color: 'Negro brillante',
        chakra: 'Raíz',
        summary:
          'La obsidiana, vidrio volcánico, se asocia con la protección, la introspección y la transformación. Es la piedra afín de Escorpio.',
        meaning: [
          'La obsidiana es vidrio volcánico que se forma cuando la lava se enfría muy rápido. Los pueblos andinos y mesoamericanos la pulían como espejo y la tallaban en herramientas.',
          'Se asocia con la protección, la introspección y la transformación personal. Es la piedra afín de Escorpio, un signo intenso y profundo.',
        ],
        care: 'Límpiala con un paño suave. Es vidrio: cuida que no se golpee contra superficies duras.',
      },
      en: {
        name: 'Obsidian',
        color: 'Glossy black',
        chakra: 'Root',
        summary:
          'Obsidian, a volcanic glass, is associated with protection, introspection and transformation. It is the kindred stone of Scorpio.',
        meaning: [
          'Obsidian is volcanic glass that forms when lava cools very quickly. Andean and Mesoamerican peoples polished it into mirrors and carved it into tools.',
          'It is associated with protection, introspection and personal transformation. It is the kindred stone of Scorpio, an intense and deep sign.',
        ],
        care: 'Clean with a soft cloth. It is glass: keep it from knocking against hard surfaces.',
      },
    },
  },
  {
    id: 'turquesa',
    slug: { es: 'turquesa', en: 'turquoise' },
    intention: 'proteccion',
    copy: {
      es: {
        name: 'Turquesa',
        color: 'Azul verdoso',
        chakra: 'Garganta',
        summary:
          'La turquesa se asocia con la protección en los viajes, la amistad y la buena fortuna. Es la piedra afín de Sagitario.',
        meaning: [
          'La turquesa es una de las piedras ornamentales más antiguas: la usaron los egipcios, los persas y los pueblos andinos, que la trabajaban en joyería ceremonial.',
          'Se asocia con la protección en los viajes, la amistad y la buena fortuna. Es la piedra afín de Sagitario, el signo viajero.',
        ],
        care: 'Es sensible: evita el agua, los aceites y los perfumes. Límpiala con un paño seco.',
      },
      en: {
        name: 'Turquoise',
        color: 'Blue-green',
        chakra: 'Throat',
        summary:
          'Turquoise is associated with protection while traveling, friendship and good fortune. It is the kindred stone of Sagittarius.',
        meaning: [
          'Turquoise is one of the oldest ornamental stones: it was used by Egyptians, Persians and Andean peoples, who worked it into ceremonial jewelry.',
          'It is associated with protection while traveling, friendship and good fortune. It is the kindred stone of Sagittarius, the traveler of the zodiac.',
        ],
        care: 'It is sensitive: avoid water, oils and perfume. Clean with a dry cloth.',
      },
    },
  },
  {
    id: 'aguamarina',
    slug: { es: 'aguamarina', en: 'aquamarine' },
    intention: 'amor',
    copy: {
      es: {
        name: 'Aguamarina',
        color: 'Celeste transparente',
        chakra: 'Garganta',
        summary:
          'La aguamarina se asocia con la calma, la claridad y la expresión serena de las emociones. Es la piedra afín de Piscis.',
        meaning: [
          'La aguamarina es un berilo de color celeste como el agua de mar. Los marineros la llevaban como amuleto para tener travesías tranquilas.',
          'Se asocia con la calma, la claridad mental y la expresión serena de las emociones. Es la piedra afín de Piscis, el signo de agua más sensible.',
        ],
        care: 'Límpiala con agua tibia y un paño suave. Es resistente, pero evita los golpes.',
      },
      en: {
        name: 'Aquamarine',
        color: 'Clear sky blue',
        chakra: 'Throat',
        summary:
          'Aquamarine is associated with calm, clarity and the gentle expression of emotions. It is the kindred stone of Pisces.',
        meaning: [
          'Aquamarine is a beryl the color of sea water. Sailors carried it as an amulet for calm voyages.',
          'It is associated with calm, mental clarity and the gentle expression of emotions. It is the kindred stone of Pisces, the most sensitive water sign.',
        ],
        care: 'Clean with lukewarm water and a soft cloth. It is sturdy, but avoid knocks.',
      },
    },
  },
];

export const findStoneBySlug = (locale: LocaleCode, slug: string) =>
  STONES.find((stone) => stone.slug[locale] === slug);

export const stoneById = (id: string) => STONES.find((stone) => stone.id === id);
