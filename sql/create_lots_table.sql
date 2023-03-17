-- Table: public.ctps_pnr_lots_polygons

-- DROP TABLE public.ctps_pnr_lots_polygons;

CREATE TABLE public.ctps_pnr_lots_polygons
(
    objectid integer NOT NULL,
    station character varying(50) COLLATE pg_catalog."default",
    st_num smallint,
    lot_id smallint,
    station_name character varying(8000) COLLATE pg_catalog."default",
    line_id character varying(8000) COLLATE pg_catalog."default",
    mode character varying(8000) COLLATE pg_catalog."default",
    permitrequired_1 character varying(255) COLLATE pg_catalog."default",
    permit_only_spaces_1 numeric(38, 8),
    permit_only_vehicles_1 numeric(38, 8),
    permit_only_space_utilization_1 character varying(255) COLLATE pg_catalog."default",
    parking_space_non_hp_1 integer,
    used_spaces_non_hp_1 integer,
    hp_parking_spaces_1 integer,
    used_hp_parking_spaces_1 integer,
    total_spaces_1 integer,
    total_used_spaces_1 integer,
    total_utilization_all_parking_1 numeric(38, 8),
    publicparkingnohp_spaces_1 integer,
    publicparkingnohp_vehicles_1 integer,
    publicparkingnohp_utilization_1 numeric(38, 8),
    cars_not_in_marked_spaces_1 integer,
    lot_ownership_1 character varying(8000) COLLATE pg_catalog."default",
    parking_fee_1 numeric(38, 8),
    gdb_geomattr_data bytea,
    shape geometry,
    CONSTRAINT enforce_srid_shape CHECK (st_srid(shape) = 26986)
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE public.ctps_pnr_lots_polygons
    OWNER to pnr_dba;

GRANT SELECT ON TABLE public.ctps_pnr_lots_polygons TO pnr_viewer;

GRANT ALL ON TABLE public.ctps_pnr_lots_polygons TO pnr_dba;

-- Index: a1777_ix1

-- DROP INDEX public.a1777_ix1;

CREATE INDEX a1777_ix1
    ON public.ctps_pnr_lots_polygons USING gist
    (shape)
    TABLESPACE pg_default;

-- Index: r2118_sde_rowid_uk

-- DROP INDEX public.r2118_sde_rowid_uk;

CREATE UNIQUE INDEX r2118_sde_rowid_uk
    ON public.ctps_pnr_lots_polygons USING btree
    (objectid)
    WITH (FILLFACTOR=75)
    TABLESPACE pg_default;