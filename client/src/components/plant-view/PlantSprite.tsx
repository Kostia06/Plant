"use client";

import { PLANT_STAGE_EMOJI, type PlantStage } from "@/lib/plant-age";

interface Props {
    stage: PlantStage;
    size?: "sm" | "md" | "lg";
}

const ART = {
    seed: {
        art: `
      .
    `,
        color: "#8b5a2b",
    },
    sprout: {
        art: `
      🌱
     /|\\
    `,
        color: "#4f7942",
    },
    sapling: {
        art: `
      🌿
     /|\\
    //|\\\\
    `,
        color: "#4f7942",
    },
    young_tree: {
        art: `
       🌳
      /////
     ///////
      | |
    `,
        color: "#2c4a3b",
    },
    mature: {
        art: `
       🌲
      //////
     ////////
    //////////
      |  |
    `,
        color: "#1a2f23",
    },
    ancient: {
        art: `
        🏔️
       🌲🌲
      🌲🌲🌲
     ///////\\\\
    ///|  |\\\\\\
    `,
        color: "#8fbc8f",
    },
};

export function PlantSprite({ stage, size = "md" }: Props) {
    const config = ART[stage];

    return (
        <div className={`ps-sprite ps-sprite--${size}`}>
            <pre className="ps-art" style={{ color: config.color }}>
                {config.art}
            </pre>
            <span className="ps-stage-label">{stage.replace("_", " ")}</span>
        </div>
    );
}
