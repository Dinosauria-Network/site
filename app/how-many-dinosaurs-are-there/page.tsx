import { getAllGenera, getGenusPeriodLabel } from "@/lib/genus-data";
import { eraClassForPeriod } from "@/lib/geologic-time";
import styles from "./page.module.css";
import { pageTitle } from "@/lib/site";

export const metadata = {
  title: pageTitle("How Many Dinosaurs Are There?"),
  description: "A running count of named dinosaur species and genera.",
};

export default async function HowManyPage() {
  const genera = getAllGenera();
  const count = genera.length;

  return (
    <>
      <main className={styles.generaListPage}>
        <div className={styles.topHero}>
          <a id="container" href="#listing" className={styles.container}>
            <span className={styles.texture} />
            <h2>
              <span className={styles.srOnly}>Currently there are over </span>
              {count}
              <span className={styles.srOnly}> different species of dinosaurs that have been identified and named.</span>
            </h2>
          </a>
        </div>

        <section id="listing" className={styles.listing}>
          <ul>
            {genera.map((g, i) => {
              const periodLabel = getGenusPeriodLabel(g) ?? g.taxonomy?.[0]?.name;
              const tn = periodLabel;
              return (
                <li key={g.post_name} className={`${styles.clearfix} ${i === 0 ? styles.firstItem : ""}`}>
                  <div className={styles.speciesName}>
                    <h3>
                      <a href={`/genus/${g.post_name}`} title={g.post_title} rel="bookmark">{g.post_title}</a>
                    </h3>
                    <div className={eraClassForPeriod(tn)} aria-label={tn} />
                    <p>{tn || 'Unknown Period'}</p>
                  </div>
                  <div className={styles.speciesDate}>
                    <h4><time dateTime={g.post_date}>{new Date(g.post_date).getFullYear()}</time></h4>
                    <h5>by {(g as any).author || "Palai"}</h5>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </>
  );
}
