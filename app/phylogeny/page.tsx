export const metadata = {
  title: "Phylogeny - Dinosauria Network",
  description:
    "Dinosaur phylogeny and taxonomy tree - Saurischia, Theropoda, Sauropodomorpha, Ornithischia",
};

export default function PhylogenyPage() {
  return (
    <div className="phylogeny-page">
      <header className="page-header">
        <h1>Dinosaur Phylogeny</h1>
        <p>
          Explore the evolutionary relationships of dinosaurs through their
          taxonomic classification.
        </p>
      </header>

      <div className="phylogeny-tree">
        <div className="clade">
          <h2>Dinosauria</h2>
          <div className="clade-branch">
            <div className="clade">
              <h3>Saurischia ("Lizard-hipped")</h3>
              <div className="clade-branch">
                <div className="taxon">
                  <h4>Theropoda</h4>
                  <p>Bipedal, mostly carnivorous dinosaurs</p>
                </div>
                <div className="taxon">
                  <h4>Sauropodomorpha</h4>
                  <p>Long-necked herbivorous dinosaurs</p>
                </div>
              </div>
            </div>
            <div className="clade">
              <h3>Ornithischia ("Bird-hipped")</h3>
              <p>Herbivorous dinosaurs with bird-like hip structure</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}