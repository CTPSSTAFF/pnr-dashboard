-- Table: public.ctps_pnr_station_points

-- DROP TABLE public.ctps_pnr_station_points;

CREATE TABLE public.ctps_pnr_station_points
(
    objectid integer NOT NULL,
    stan_addr character varying(79) COLLATE pg_catalog."default",
    st_code character varying(254) COLLATE pg_catalog."default",
    st_num integer,
    mode_rt character varying(5) COLLATE pg_catalog."default",
    mode_cr character varying(5) COLLATE pg_catalog."default",
    mode_brt character varying(10) COLLATE pg_catalog."default",
    mode_other character varying(10) COLLATE pg_catalog."default",
    lines character varying(200) COLLATE pg_catalog."default",
    sdr_present character varying(255) COLLATE pg_catalog."default",
    ddr_present character varying(255) COLLATE pg_catalog."default",
    ribbon_present character varying(255) COLLATE pg_catalog."default",
    key_present character varying(255) COLLATE pg_catalog."default",
    invu_present character varying(255) COLLATE pg_catalog."default",
    curve_present character varying(255) COLLATE pg_catalog."default",
    doublelooppresent character varying(255) COLLATE pg_catalog."default",
    singlelooppresent character varying(255) COLLATE pg_catalog."default",
    hanger_present character varying(255) COLLATE pg_catalog."default",
    other_present character varying(255) COLLATE pg_catalog."default",
    rack_type character varying(255) COLLATE pg_catalog."default",
    numberspaces numeric(38, 8),
    numberbikes numeric(38, 8),
    otherlocations_howmany numeric(38, 8),
    biketrail_yn smallint,
    bikelanes_yn smallint,
    sidewalks_yn smallint,
    sidewalks_cond character varying(255) COLLATE pg_catalog."default",
    crosswalks_yn smallint,
    crosswalks_cond character varying(255) COLLATE pg_catalog."default",
    sigints_yn smallint,
    sigints_pedind_yn smallint,
    healthy smallint,
    lots smallint,
    town character varying(40) COLLATE pg_catalog."default",
    town_id smallint,
    gdb_geomattr_data bytea,
    shape geometry,
    CONSTRAINT enforce_srid_shape CHECK (st_srid(shape) = 26986)
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE public.ctps_pnr_station_points
    OWNER to pnr_dba;

GRANT SELECT ON TABLE public.ctps_pnr_station_points TO pnr_viewer;

GRANT ALL ON TABLE public.ctps_pnr_station_points TO pnr_dba;

-- Index: a1810_ix1

-- DROP INDEX public.a1810_ix1;

CREATE INDEX a1810_ix1
    ON public.ctps_pnr_station_points USING gist
    (shape)
    TABLESPACE pg_default;

-- Index: r2156_sde_rowid_uk

-- DROP INDEX public.r2156_sde_rowid_uk;

CREATE UNIQUE INDEX r2156_sde_rowid_uk
    ON public.ctps_pnr_station_points USING btree
    (objectid)
    WITH (FILLFACTOR=75)
    TABLESPACE pg_default;