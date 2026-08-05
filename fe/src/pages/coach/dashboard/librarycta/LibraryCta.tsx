import { Link } from "wouter";
import "./style.css";

type LibraryCtaProps = {
  templateCount: number;
};

export function LibraryCta({ templateCount }: LibraryCtaProps) {
  return (
    <section className="library-cta">
      <h3>Library template</h3>
      <p>
        Assegna velocemente programmi pre-impostati
        {templateCount > 0 ? ` (${templateCount} disponibili)` : ""}.
      </p>
      <Link href="/templates" className="library-cta__link">
        Sfoglia libreria →
      </Link>
    </section>
  );
}
