--
-- PostgreSQL database dump
--

\restrict Iyu43lbexhwFAzY6P3Ua1uuKoa9o2DgmhryYST1WTr5XLtSRQkakh0ZYzZ6zf07

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Order; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Order" (
    id integer NOT NULL,
    "tableId" integer NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "closedAt" timestamp(3) without time zone
);


ALTER TABLE public."Order" OWNER TO postgres;

--
-- Name: OrderItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."OrderItem" (
    id integer NOT NULL,
    "orderId" integer NOT NULL,
    "productId" integer,
    "productName" text NOT NULL,
    "unitPrice" integer NOT NULL,
    quantity integer NOT NULL,
    "payerName" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."OrderItem" OWNER TO postgres;

--
-- Name: OrderItem_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."OrderItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."OrderItem_id_seq" OWNER TO postgres;

--
-- Name: OrderItem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."OrderItem_id_seq" OWNED BY public."OrderItem".id;


--
-- Name: Order_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Order_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Order_id_seq" OWNER TO postgres;

--
-- Name: Order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Order_id_seq" OWNED BY public."Order".id;


--
-- Name: Payment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Payment" (
    id integer NOT NULL,
    "orderId" integer NOT NULL,
    "payerName" text,
    amount integer NOT NULL,
    "paymentMethod" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Payment" OWNER TO postgres;

--
-- Name: Payment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Payment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Payment_id_seq" OWNER TO postgres;

--
-- Name: Payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Payment_id_seq" OWNED BY public."Payment".id;


--
-- Name: Product; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Product" (
    id integer NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    price integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Product" OWNER TO postgres;

--
-- Name: Product_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Product_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Product_id_seq" OWNER TO postgres;

--
-- Name: Product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Product_id_seq" OWNED BY public."Product".id;


--
-- Name: Table; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Table" (
    id integer NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    section text DEFAULT 'Vnitřek'::text NOT NULL
);


ALTER TABLE public."Table" OWNER TO postgres;

--
-- Name: Table_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Table_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Table_id_seq" OWNER TO postgres;

--
-- Name: Table_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Table_id_seq" OWNED BY public."Table".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: Order id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order" ALTER COLUMN id SET DEFAULT nextval('public."Order_id_seq"'::regclass);


--
-- Name: OrderItem id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrderItem" ALTER COLUMN id SET DEFAULT nextval('public."OrderItem_id_seq"'::regclass);


--
-- Name: Payment id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment" ALTER COLUMN id SET DEFAULT nextval('public."Payment_id_seq"'::regclass);


--
-- Name: Product id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Product" ALTER COLUMN id SET DEFAULT nextval('public."Product_id_seq"'::regclass);


--
-- Name: Table id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Table" ALTER COLUMN id SET DEFAULT nextval('public."Table_id_seq"'::regclass);


--
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Order" (id, "tableId", status, "createdAt", "updatedAt", "closedAt") FROM stdin;
1	1	closed	2026-03-12 17:11:43.163	2026-03-12 17:22:03.066	2026-03-12 17:22:03.06
2	1	closed	2026-03-12 17:22:06.486	2026-03-12 17:22:11.224	2026-03-12 17:22:11.224
3	1	closed	2026-03-12 17:23:12.021	2026-03-12 17:27:18.948	2026-03-12 17:27:18.947
4	1	closed	2026-03-12 17:32:26.567	2026-03-12 17:32:58.67	2026-03-12 17:32:58.669
5	1	closed	2026-03-12 17:40:48.574	2026-03-12 17:50:05.155	2026-03-12 17:50:05.154
6	1	closed	2026-03-12 17:50:08.048	2026-03-12 17:50:12.101	2026-03-12 17:50:12.101
8	2	open	2026-03-12 17:52:51.002	2026-03-12 17:52:51.002	\N
7	1	closed	2026-03-12 17:52:44.967	2026-03-12 18:14:45.108	2026-03-12 18:14:45.107
9	1	closed	2026-03-12 18:17:10.82	2026-03-12 19:00:18.281	2026-03-12 19:00:18.28
10	1	closed	2026-03-12 19:00:23.79	2026-03-12 19:00:52.29	2026-03-12 19:00:52.29
11	1	closed	2026-03-16 19:21:19.453	2026-03-16 19:23:55.181	2026-03-16 19:23:55.179
12	1	open	2026-03-16 19:37:39.988	2026-03-16 19:37:39.988	\N
\.


--
-- Data for Name: OrderItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."OrderItem" (id, "orderId", "productId", "productName", "unitPrice", quantity, "payerName", "createdAt") FROM stdin;
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Payment" (id, "orderId", "payerName", amount, "paymentMethod", "createdAt") FROM stdin;
1	1	\N	233	hotově	2026-03-12 17:21:54.293
2	1	\N	76	hotově	2026-03-12 17:22:00.053
3	1	\N	96	hotově	2026-03-12 17:22:03.057
4	2	\N	58	hotově	2026-03-12 17:22:11.22
5	3	\N	58	hotově	2026-03-12 17:27:13.642
6	3	\N	174	hotově	2026-03-12 17:27:18.943
7	4	\N	116	hotově	2026-03-12 17:32:40.765
8	4	\N	86	hotově	2026-03-12 17:32:45.845
9	4	\N	94	hotově	2026-03-12 17:32:50.408
10	4	\N	246	hotově	2026-03-12 17:32:58.667
11	6	\N	58	hotově	2026-03-12 17:50:12.095
12	7	\N	58	hotově	2026-03-12 18:14:45.099
13	9	\N	101	hotově	2026-03-12 19:00:04.24
14	9	\N	104	hotově	2026-03-12 19:00:18.276
15	10	\N	116	hotově	2026-03-12 19:00:44.76
16	10	\N	232	hotově	2026-03-12 19:00:49.762
17	10	\N	116	hotově	2026-03-12 19:00:52.288
18	11	\N	58	hotově	2026-03-16 19:23:55.172
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Product" (id, name, category, price, "isActive", "createdAt", "updatedAt") FROM stdin;
1	Pilsner Urquell hladinka	Pivo	58	t	2026-03-12 17:27:41.379	1969-12-31 23:00:00
2	Pilsner Urquell šnyt, mlíko	Pivo	46	t	2026-03-12 17:27:41.379	1969-12-31 23:00:00
3	Pilsner Urquell malé	Pivo	43	t	2026-03-12 17:27:41.379	1969-12-31 23:00:00
4	Radegast 12°	Pivo	48	t	2026-03-12 17:27:41.379	1969-12-31 23:00:00
5	Radegast 12° šnyt, mlíko	Pivo	38	t	2026-03-12 17:27:41.379	1969-12-31 23:00:00
6	Radegast 12° malé	Pivo	38	t	2026-03-12 17:27:41.379	1969-12-31 23:00:00
8	Turecká káva	Teplé nápoje	69	t	2026-03-12 19:07:19.136	1969-12-31 23:00:00
10	Rulandské šedé	Víno	40	t	2026-03-12 19:08:28.858	1969-12-31 23:00:00
7	Hranolky	Jídlo	69	t	2026-03-12 19:06:24.379	2026-03-16 14:51:43.223
9	Zelená	Alkohol	40	t	2026-03-12 19:08:28.858	2026-03-16 18:54:19.227
\.


--
-- Data for Name: Table; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Table" (id, name, status, "createdAt", "updatedAt", section) FROM stdin;
1	Stůl 1	open	2026-03-12 17:13:16.971	1969-12-31 23:00:00	Vnitřek
2	Stůl 2	open	2026-03-12 17:13:16.971	1969-12-31 23:00:00	Vnitřek
3	Stůl 3	open	2026-03-12 17:13:16.971	1969-12-31 23:00:00	Vnitřek
4	Stůl 4	open	2026-03-12 17:13:16.971	1969-12-31 23:00:00	Vnitřek
5	Stůl 5	open	2026-03-12 17:13:16.971	1969-12-31 23:00:00	Vnitřek
6	Stůl 6	open	2026-03-16 20:20:29.572	1969-12-31 23:00:00	Vnitřek
7	Stůl 7	open	2026-03-16 20:20:29.572	1969-12-31 23:00:00	Vnitřek
8	Stůl 8	open	2026-03-16 20:20:29.572	1969-12-31 23:00:00	Vnitřek
9	Stůl 9	open	2026-03-16 20:20:29.572	1969-12-31 23:00:00	Vnitřek
10	Stůl 10	open	2026-03-16 20:20:29.572	1969-12-31 23:00:00	Vnitřek
11	Stůl 11	open	2026-03-16 20:20:29.572	1969-12-31 23:00:00	Vnitřek
12	Stůl 12	open	2026-03-16 20:40:15.134	1969-12-31 23:00:00	Vnitřek
13	Venek 1	open	2026-03-16 20:41:47.521	1969-12-31 23:00:00	Zahrádka
14	Venek 2	open	2026-03-16 20:41:47.521	1969-12-31 23:00:00	Zahrádka
15	Venek 3	open	2026-03-16 20:41:47.521	1969-12-31 23:00:00	Zahrádka
16	Venek 4	open	2026-03-16 20:41:47.521	1969-12-31 23:00:00	Zahrádka
17	Venek 5	open	2026-03-16 20:41:47.521	1969-12-31 23:00:00	Zahrádka
18	Venek 6	open	2026-03-16 20:41:47.521	1969-12-31 23:00:00	Zahrádka
19	Venek 7	open	2026-03-16 20:41:47.521	1969-12-31 23:00:00	Zahrádka
20	Venek 8	open	2026-03-16 20:41:47.521	1969-12-31 23:00:00	Zahrádka
21	Venek 9	open	2026-03-16 20:41:47.521	1969-12-31 23:00:00	Zahrádka
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
be102301-53b1-4652-b010-f374f075aaa1	f12b6ab21f795e07f29851055f92e154452d64eee90ac3fbe09689fdf066c2c0	2026-03-12 17:07:29.048436+01	20260312160729_init	\N	\N	2026-03-12 17:07:29.014969+01	1
1567bb38-d792-4119-b6d3-35cb91e774f6	dc771a646e2834ea81fd84c213ce0b4f1def6d8eeee9c7a424762609bac66fe0	2026-03-16 20:39:08.828022+01	20260316193908_add_table_section	\N	\N	2026-03-16 20:39:08.792267+01	1
\.


--
-- Name: OrderItem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."OrderItem_id_seq"', 42, true);


--
-- Name: Order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Order_id_seq"', 12, true);


--
-- Name: Payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Payment_id_seq"', 18, true);


--
-- Name: Product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Product_id_seq"', 10, true);


--
-- Name: Table_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Table_id_seq"', 21, true);


--
-- Name: OrderItem OrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: Table Table_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Table"
    ADD CONSTRAINT "Table_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: OrderItem OrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_tableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES public."Table"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payment Payment_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict Iyu43lbexhwFAzY6P3Ua1uuKoa9o2DgmhryYST1WTr5XLtSRQkakh0ZYzZ6zf07

