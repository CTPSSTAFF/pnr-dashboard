-- Table: public.ctps_pnr_areas_w_stations

-- DROP TABLE public.ctps_pnr_areas_w_stations;

CREATE TABLE public.ctps_pnr_areas_w_stations
(
    objectid integer NOT NULL,
    town character varying(40) COLLATE pg_catalog."default",
    town_id smallint,
    gdb_geomattr_data bytea,
    shape geometry,
    CONSTRAINT enforce_srid_shape CHECK (st_srid(shape) = 2249)
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE public.ctps_pnr_areas_w_stations
    OWNER to pnr_dba;

GRANT SELECT ON TABLE public.ctps_pnr_areas_w_stations TO pnr_viewer;

GRANT ALL ON TABLE public.ctps_pnr_areas_w_stations TO pnr_dba;

-- Index: a1809_ix1

-- DROP INDEX public.a1809_ix1;

CREATE INDEX a1809_ix1
    ON public.ctps_pnr_areas_w_stations USING gist
    (shape)
    TABLESPACE pg_default;

-- Index: r2155_sde_rowid_uk

-- DROP INDEX public.r2155_sde_rowid_uk;

CREATE UNIQUE INDEX r2155_sde_rowid_uk
    ON public.ctps_pnr_areas_w_stations USING btree
    (objectid)
    WITH (FILLFACTOR=75)
    TABLESPACE pg_default;